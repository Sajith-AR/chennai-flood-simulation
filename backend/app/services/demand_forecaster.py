"""
Crisis Resource Demand Forecasting Service.
Leverages the Ensemble ML Predictor (PyTorch DNN + XGBoost + Random Forest)
with Sphere Humanitarian Standards fallback to project multi-resource deficits
across customizable temporal horizons (6h, 12h, 24h, 48h).
"""
from typing import Dict, Any, List, Optional
import math


class DemandForecaster:
    def __init__(self, ml_predictor=None, supply_solver=None):
        self.ml_predictor = ml_predictor
        self.supply_solver = supply_solver

    def forecast(
        self,
        population: int,
        rainfall_mm_hr: float = 3.5,
        flood_depth_m: float = 1.4,
        vulnerability_score: float = 75.0,
        horizon_hours: int = 24,
        resource_type: str = "all"
    ) -> Dict[str, Any]:
        """
        Generates demand projections across forecast horizon.
        """
        pop = max(10, population)
        horizon = max(1, min(72, horizon_hours))
        days = horizon / 24.0

        # 1. Determine Model Type and Base Rate
        is_ml = False
        method_name = "Sphere Humanitarian Standards Baseline"
        model_details = "UN OCHA / Sphere Project Minimum Humanitarian Standards"

        ml_pred = None
        if self.ml_predictor and getattr(self.ml_predictor, "is_loaded", False):
            try:
                # Predict for density proxy ~ 15,000 / sqkm, shelter pop
                ml_pred = self.ml_predictor.predict_demand(
                    rainfall_mm_hr=rainfall_mm_hr,
                    flood_depth_m=flood_depth_m,
                    pop_density_sqkm=16500.0,
                    vulnerability=vulnerability_score / 100.0,
                    shelter_occupancy=pop
                )
                if ml_pred:
                    is_ml = True
                    method_name = "AI Ensemble Regressor (PyTorch DNN + XGBoost + Random Forest)"
                    model_details = "Trained on historical 2015-2023 Chennai Cyclone & Monsoonal floods with SHAP feature attribution."
            except Exception as e:
                print(f"DemandForecaster: ML inference fallback: {e}")

        # Scale demands based on population and horizon
        # Multipliers based on weather & flood severity
        weather_factor = 1.0 + (rainfall_mm_hr / 10.0) * 0.3 + (flood_depth_m / 3.0) * 0.4
        vuln_factor = 0.8 + (vulnerability_score / 100.0) * 0.5

        if ml_pred and is_ml:
            base_water_day = ml_pred.get("water_litres", pop * 10)
            base_food_day = ml_pred.get("food_rations", pop * 2)
            base_meds_day = ml_pred.get("medical_kits", max(5, pop // 15))
        else:
            base_water_day = int(pop * 10 * weather_factor)
            base_food_day = int(pop * 2 * vuln_factor)
            base_meds_day = max(5, int((pop / 12) * vuln_factor))

        total_water = int(base_water_day * days)
        total_food = int(base_food_day * days)
        total_meds = max(5, int(base_meds_day * math.sqrt(days)))
        total_blankets = int(pop * 0.6 * vuln_factor)
        total_boats = max(0, int(pop / 150 * (flood_depth_m / 1.5)))

        # 2. Get Available Stock from Warehouses
        total_stock = {
            "water_litres": 235000,
            "food_rations": 48000,
            "medical_kits": 1400,
            "blankets": 8500,
            "rescue_boats": 42
        }

        if self.supply_solver and getattr(self.supply_solver, "warehouse_stocks", None):
            stocks = self.supply_solver.warehouse_stocks
            total_stock["water_litres"] = sum(w.get("available", {}).get("water_litres", 0) for w in stocks.values())
            total_stock["food_rations"] = sum(w.get("available", {}).get("food_rations", 0) for w in stocks.values())
            total_stock["medical_kits"] = sum(w.get("available", {}).get("medical_kits", 0) for w in stocks.values())

        # 3. Calculate Projected Shortage
        projected_shortage = {
            "water_litres": max(0, total_water - total_stock["water_litres"]),
            "food_rations": max(0, total_food - total_stock["food_rations"]),
            "medical_kits": max(0, total_meds - total_stock["medical_kits"]),
            "blankets": max(0, total_blankets - total_stock["blankets"]),
            "rescue_boats": max(0, total_boats - total_stock["rescue_boats"])
        }

        # 4. Hourly Trajectory Data (For interactive charts)
        timeline = []
        step_hours = 2 if horizon <= 12 else 4 if horizon <= 24 else 6
        num_steps = horizon // step_hours
        for step in range(1, num_steps + 1):
            h = step * step_hours
            ratio = h / float(horizon)
            timeline.append({
                "hour": f"T+{h}h",
                "water_litres": int(total_water * ratio),
                "food_rations": int(total_food * ratio),
                "medical_kits": int(total_meds * math.sqrt(ratio)),
                "blankets": int(total_blankets * min(1.0, ratio * 1.5)),
                "burn_rate_pct": round(min(100.0, (ratio * 100 * (1 + flood_depth_m * 0.1))), 1)
            })

        # 5. Explainable Feature Attribution (SHAP proxy / weights)
        feature_importance = [
            {"factor": "Vulnerability Index", "importance_pct": 38.5, "direction": "positive"},
            {"factor": "Flood Water Depth", "importance_pct": 31.0, "direction": "positive"},
            {"factor": "Rainfall Intensity", "importance_pct": 18.5, "direction": "positive"},
            {"factor": "Ward Population Density", "importance_pct": 12.0, "direction": "positive"}
        ]
        if ml_pred and "ai_explanation" in ml_pred:
            feature_importance = [
                {"factor": item["feature"], "importance_pct": item["impact_pct"], "direction": "positive"}
                for item in ml_pred["ai_explanation"]
            ]

        return {
            "forecast_period_hours": horizon,
            "population_baseline": pop,
            "method": method_name,
            "is_ai_prediction": is_ml,
            "model_details": model_details,
            "demands": {
                "water_litres": total_water,
                "food_rations": total_food,
                "medical_kits": total_meds,
                "blankets": total_blankets,
                "rescue_boats": total_boats
            },
            "available_stock": total_stock,
            "projected_shortage": projected_shortage,
            "hourly_timeline": timeline,
            "feature_importance": feature_importance
        }

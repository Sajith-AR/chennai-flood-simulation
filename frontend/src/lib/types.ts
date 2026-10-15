export type Coordinates = [number, number]; // [lat, lon]

export type SeverityLevel = 'advisory' | 'moderate' | 'severe' | 'catastrophic';

export type RouteStatus = 'clear' | 'rerouted' | 'caution' | 'impassable';

export type ShelterStatusType = 'normal' | 'available' | 'near_capacity' | 'full' | 'compromised';

export interface FloodZoneInput {
  id: string;
  type: 'circle' | 'polygon';
  coordinates: Coordinates[]; // for polygon or [center] for circle
  radius_meters?: number; // for circle
  name?: string;
}

export interface DisasterParameters {
  rainfall_intensity_mm_hr: number; // 1 to 5 scale or direct mm/hr
  flood_depth_meters: number; // 0.1m to 3.0m
  spread_rate_meters_hr: number; // 50m/hr to 500m/hr
  duration_hours: number; // e.g. 6 or 12
}

export interface SimulationRequest {
  flood_zones: FloodZoneInput[];
  parameters: DisasterParameters;
}

export interface FloodPolygonFeature {
  type: 'Feature';
  properties: {
    zone_id: string;
    water_depth_m: number;
    severity: SeverityLevel;
    fill_color: string;
    stroke_color: string;
    fill_opacity: number;
    area_sq_km?: number;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON format: [[ [lon, lat], ... ]]
  };
}

export interface EvacuationRouteFeature {
  type: 'Feature';
  properties: {
    route_id: string;
    source_cluster_id: string;
    source_name: string;
    destination_shelter_id: string;
    destination_name: string;
    evacuee_count: number;
    distance_km: number;
    estimated_time_min: number;
    status: RouteStatus;
    color: string;
    transport_mode?: 'foot' | 'truck' | 'amphibious' | 'helicopter';
    vehicle_type?: string;
    convoy_vehicle_count?: number;
    water_clearance_depth_m?: number;
    depth_profile?: number[];
    manifest?: {
      water_litres?: number;
      food_rations?: number;
      medical_kits?: number;
      life_jackets?: number;
    };
  };
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // GeoJSON format: [ [lon, lat], ... ]
  };
}

export interface SupplyRouteFeature {
  type: 'Feature';
  properties: {
    route_id: string;
    transport_mode?: 'truck' | 'amphibious' | 'helicopter';
    vehicle_type?: string;
    convoy_vehicle_count?: number;
    water_clearance_depth_m?: number;
    depth_profile?: number[];
    warehouse_id: string;
    warehouse_name: string;
    destination_id: string;
    destination_name: string;
    distance_km: number;
    transit_time_min: number;
    cargo: {
      water_litres: number;
      food_rations: number;
      medical_kits: number;
      life_jackets?: number;
      satellite_phones?: number;
    };
    status: 'active' | 'completed' | 'blocked';
    color: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // GeoJSON format: [ [lon, lat], ... ]
  };
}

export interface ShelterAllocation {
  shelter_id: string;
  name: string;
  neighborhood?: string;
  coordinates?: Coordinates;
  allocated_evacuees: number;
  remaining_capacity: number;
  total_capacity: number;
  current_occupancy: number;
  occupancy_pct: number;
  status: ShelterStatusType;
  amenities?: string[];
}

export interface InventoryStatus {
  total_water_litres: number;
  allocated_water_litres: number;
  available_water_litres: number;
  total_food_rations: number;
  allocated_food_rations: number;
  available_food_rations: number;
  total_medical_kits: number;
  allocated_medical_kits: number;
  available_medical_kits: number;
}

export interface IsolatedCluster {
  cluster_id: string;
  name: string;
  location: Coordinates;
  trapped_population: number;
  requires_airlift: boolean;
}

export interface TimelineStep {
  time_step: number; // hour index 0..T
  hour: number;
  description?: string;
  flood_polygons: {
    type: 'FeatureCollection';
    features: FloodPolygonFeature[];
  };
  evacuation_routes: {
    type: 'FeatureCollection';
    features: EvacuationRouteFeature[];
  };
  supply_routes: {
    type: 'FeatureCollection';
    features: SupplyRouteFeature[];
  };
  shelter_allocations: ShelterAllocation[];
  inventory_status: InventoryStatus;
  isolated_clusters: IsolatedCluster[];
  metrics: {
    total_flooded_area_sq_km: number;
    total_affected_population: number;
    total_evacuated_population: number;
    unassigned_stranded_population: number;
    severed_roads_count: number;
    active_routes_count: number;
  };
}

export interface SimulationResponse {
  simulation_id: string;
  status: 'completed' | 'running' | 'error';
  computed_at: string;
  timeline: TimelineStep[];
  summary: {
    total_affected_population: number;
    total_evacuated: number;
    stranded_requiring_rescue: number;
    peak_inundation_hour: number;
    max_flooded_area_sq_km: number;
    shelter_overall_utilization_pct: number;
  };
}

export interface ShelterEntity {
  id: string;
  name: string;
  location: Coordinates;
  neighborhood: string;
  capacity: number;
  current_occupancy: number;
  amenities: string[];
}

export interface WarehouseEntity {
  id: string;
  name: string;
  location: Coordinates;
  address: string;
  supplies: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
  };
}

export interface DistributionPointEntity {
  id: string;
  name: string;
  location: Coordinates;
  target_ward: string;
  demand: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    is_ai_predicted?: boolean;
    ai_explanation?: { feature: string; impact_pct: number }[];
  };
  assigned_evacuees: number;
  current_stock: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
  };
}

export interface PopulationClusterEntity {
  id: string;
  name: string;
  location: Coordinates;
  estimated_population: number;
  density_per_sq_km: number;
  risk_level: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  center: Coordinates;
  radius_meters: number;
  polygon_coordinates?: Coordinates[];
  default_rainfall: number;
  default_depth: number;
  default_spread: number;
}

export interface MapInitResponse {
  center: Coordinates;
  bounds: [Coordinates, Coordinates];
  shelters: ShelterEntity[];
  warehouses: WarehouseEntity[];
  distribution_points: DistributionPointEntity[];
  population_clusters: PopulationClusterEntity[];
  presets: PresetScenario[];
}

export interface ResourceAllocateRequest {
  shelter_or_point_id: string;
  supplies: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
  };
  warehouse_id?: string;
}

export interface ResourceAllocateResponse {
  success: boolean;
  message?: string;
  updated_inventory: InventoryStatus;
  allocation_details: {
    target_id: string;
    allocated_water_litres: number;
    allocated_food_rations: number;
    allocated_medical_kits: number;
    deficit_remaining: {
      water_litres: number;
      food_rations: number;
      medical_kits: number;
    };
  };
}

export interface StagingBaseEntity {
  id: string;
  name: string;
  type: 'helicopter_base' | 'amphibious_base';
  location: Coordinates;
  callsign: string;
  stationed_assets: string;
  operational_radius_km: number;
  readiness_status: 'operational' | 'standby' | 'deployed';
}

export interface RouteInspectionData {
  route_id: string;
  route_name: string;
  route_category: 'evacuation' | 'supply' | 'airlift';
  transport_mode: 'truck' | 'amphibious' | 'helicopter' | 'foot';
  vehicle_type: string;
  source_name: string;
  destination_name: string;
  distance_km: number;
  transit_time_min: number;
  convoy_vehicle_count: number;
  water_clearance_depth_m: number;
  max_water_depth_m: number;
  depth_profile: { step_km: number; depth_m: number; elevation_m: number; status: 'clear' | 'caution' | 'submerged' }[];
  evacuee_or_capacity_count: number;
  manifest: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    life_jackets?: number;
    satellite_radios?: number;
  };
  status: 'clear' | 'rerouted' | 'caution' | 'impassable' | 'active' | 'airlift_deployed' | 'completed' | 'blocked';
  recommendation: string;
}

export interface AIAdvisorData {
  risk_radar_level: 'DEFCON 4 (ADVISORY)' | 'DEFCON 3 (ELEVATED)' | 'DEFCON 2 (SEVERE)' | 'DEFCON 1 (CRITICAL)';
  radar_score: number;
  tactical_summary: string;
  evacuation_advice: {
    id: string;
    priority: 'CRITICAL' | 'URGENT' | 'MONITOR';
    title: string;
    details: string;
    affected_ward: string;
    target_shelter: string;
    mode_suggested: 'Amphibious Zodiac' | 'IAF Chetak Sortie' | 'High-Clearance 6x6 Truck';
  }[];
  broadcast: {
    english: string;
    tamil: string;
    timestamp: string;
    code: string;
    alert_level: 'Red Alert' | 'Orange Alert' | 'Emergency Evacuation';
  };
  bottlenecks: {
    id: string;
    corridor_name: string;
    zone: string;
    water_depth_m: number;
    traffic_choke_status: 'SEVERED' | 'HIGH IMPEDANCE' | 'SUBMERGED BRIDGE' | 'RESTRICTED';
    suggested_detour: string;
  }[];
  ward_rankings: {
    ward_id: string;
    ward_name: string;
    risk_index: number;
    vulnerable_population: number;
    water_depth_m: number;
    trend: 'rising' | 'peaking' | 'receding';
  }[];
}

export interface DisasterIncident {
  id: string;
  title: string;
  location: string;
  zone: string;
  coordinates: Coordinates;
  disaster_type: string;
  water_depth_m: number;
  affected_population: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  status: 'reported' | 'verified' | 'allocated' | 'dispatched' | 'resolved';
  reported_at: string;
  description: string;
  demands: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets?: number;
    rescue_boats?: number;
  };
  road_accessible: boolean;
  allocated_depot?: string | null;
  allocated_resources?: Record<string, number> | null;
}

export interface NLPExtractionResult {
  location: string;
  zone: string;
  coordinates: Coordinates;
  disaster_type: string;
  water_depth_m: number;
  affected_population: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  demands: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets: number;
    rescue_boats: number;
  };
  confidence_score: number;
  extracted_entities: {
    entity: string;
    text: string;
    start?: number;
    end?: number;
    canonical?: string;
    value?: any;
    level?: string;
  }[];
  explanation: string;
  road_accessible: boolean;
}

export interface DemandForecastResult {
  forecast_period_hours: number;
  population_baseline: number;
  method: string;
  is_ai_prediction: boolean;
  model_details: string;
  demands: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets: number;
    rescue_boats: number;
  };
  available_stock: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets: number;
    rescue_boats: number;
  };
  projected_shortage: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets: number;
    rescue_boats: number;
  };
  hourly_timeline: {
    hour: string;
    water_litres: number;
    food_rations: number;
    medical_kits: number;
    blankets: number;
    burn_rate_pct: number;
  }[];
  feature_importance: {
    factor: string;
    importance_pct: number;
    direction: string;
  }[];
}

export interface VulnerabilityRanking {
  id: string;
  name: string;
  incident_id?: string;
  zone?: string;
  disaster_type?: string;
  priority_score: number;
  priority_tier: 'Critical' | 'High' | 'Medium' | 'Low';
  badge_color: string;
  affected_population: number;
  urgency: string;
  water_depth_m: number;
  road_accessible: boolean;
  coordinates: Coordinates;
  demands?: Record<string, number>;
  factor_breakdown: {
    factor: string;
    raw_value: string;
    normalized_score: number;
    weight_pct: number;
    contribution: number;
  }[];
  explainable_rationale: string;
}

export interface AllocationPlan {
  status: string;
  solver_method: string;
  objective_value?: number;
  allocations_count: number;
  allocations: {
    allocation_id: string;
    source_warehouse_id: string;
    source_warehouse_name: string;
    destination_incident_id: string;
    destination_name: string;
    destination_coordinates: Coordinates;
    source_coordinates: Coordinates;
    distance_km: number;
    estimated_transit_min: number;
    transport_mode: 'truck' | 'amphibious' | 'helicopter';
    vehicle_type: string;
    allocated_supplies: Record<string, number>;
    rationale: string;
  }[];
  unmet_demands: {
    incident_id: string;
    location: string;
    unmet_resources: Record<string, number>;
    reason: string;
  }[];
  remaining_stocks: {
    id: string;
    name: string;
    location: Coordinates;
    available: Record<string, number>;
  }[];
  summary: string;
}

export interface OptimizedRouteResult {
  route_id: string;
  source_name: string;
  destination_name: string;
  distance_km: number;
  travel_time_min: number;
  transport_mode: 'truck' | 'amphibious' | 'helicopter';
  vehicle_type: string;
  node_count: number;
  geojson: any;
  waypoints: string[];
  bypassed_hazards: string[];
  is_ground_accessible: boolean;
}

export interface PipelineRunResult {
  status: string;
  workflow: string;
  pipeline_stages_completed: number;
  results: {
    step1_incident: DisasterIncident;
    step2_nlp_extraction: NLPExtractionResult;
    step3_demand_forecast: DemandForecastResult;
    step4_vulnerability_score: VulnerabilityRanking;
    step5_resource_allocation: AllocationPlan;
    step6_route_optimization: OptimizedRouteResult;
    step7_alert_broadcast: {
      alert_id: string;
      channel: string;
      english_script: string;
      tamil_script: string;
      dispatch_status: string;
      target_audience: string;
    };
  };
}

export interface DashboardStats {
  status: string;
  incidents_count: number;
  critical_incidents_count: number;
  total_affected_population: number;
  safe_shelters_count: number;
  active_depots_count: number;
  available_inventory: {
    water_litres: number;
    food_rations: number;
    medical_kits: number;
  };
  road_network: {
    total_nodes: number;
    total_edges: number;
    severed_roads_count: number;
    active_routes_count: number;
  };
  active_field_teams: number;
  system_status: string;
  defcon_level: string;
}



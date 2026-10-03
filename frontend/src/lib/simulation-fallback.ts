import {
  SimulationRequest,
  SimulationResponse,
  TimelineStep,
  FloodPolygonFeature,
  EvacuationRouteFeature,
  SupplyRouteFeature,
  ShelterAllocation,
  InventoryStatus,
  IsolatedCluster,
  Coordinates,
  SeverityLevel,
  RouteStatus,
  ShelterStatusType,
} from './types';
import {
  CHENNAI_SHELTERS,
  CHENNAI_WAREHOUSES,
  CHENNAI_DISTRIBUTION_POINTS,
  CHENNAI_POPULATION_CLUSTERS,
  SEVERITY_COLORS,
} from './constants';

function haversineDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate circular polygon approximation (GeoJSON: [lon, lat])
function createCirclePolygonCoordinates(
  center: Coordinates,
  radiusMeters: number,
  points: number = 32
): number[][][] {
  const coords: number[][] = [];
  const latR = radiusMeters / 111320;
  const lonR = radiusMeters / (111320 * Math.cos((center[0] * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const lat = center[0] + latR * Math.sin(angle);
    const lon = center[1] + lonR * Math.cos(angle);
    coords.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  }
  return [coords];
}

// Dilate custom polygon around its centroid
function dilatePolygon(
  coords: Coordinates[],
  scaleFactor: number
): number[][][] {
  if (coords.length < 3) return [[]];
  let centerLat = 0;
  let centerLon = 0;
  coords.forEach((c) => {
    centerLat += c[0];
    centerLon += c[1];
  });
  centerLat /= coords.length;
  centerLon /= coords.length;

  const result: number[][] = [];
  coords.forEach((c) => {
    const lat = centerLat + (c[0] - centerLat) * scaleFactor;
    const lon = centerLon + (c[1] - centerLon) * scaleFactor;
    result.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  });
  // Ensure closed ring
  if (result.length > 0) {
    result.push([...result[0]]);
  }
  return [result];
}

// Generate multi-waypoint path that bends around flood epicenters
function generateSafePath(
  start: Coordinates,
  end: Coordinates,
  floodCenters: { center: Coordinates; radiusKm: number }[],
  steps: number = 5
): { path: number[][]; status: RouteStatus } {
  let wasDetoured = false;
  let isBlocked = false;

  const path: number[][] = [];
  path.push([Number(start[1].toFixed(6)), Number(start[0].toFixed(6))]);

  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    let lat = start[0] + (end[0] - start[0]) * ratio;
    let lon = start[1] + (end[1] - start[1]) * ratio;

    // Check collision with flood centers
    for (const fc of floodCenters) {
      const dist = haversineDistanceKm([lat, lon], fc.center);
      if (dist < fc.radiusKm * 1.1) {
        wasDetoured = true;
        // Shift waypoint away from center
        const offsetDirection = (lat - fc.center[0]) >= 0 ? 1 : -1;
        const pushLat = (fc.radiusKm * 1.25) / 111;
        const pushLon = (fc.radiusKm * 1.25) / (111 * Math.cos((lat * Math.PI) / 180));
        lat = fc.center[0] + offsetDirection * pushLat;
        lon = fc.center[1] + (offsetDirection > 0 ? pushLon : -pushLon);

        if (dist < fc.radiusKm * 0.4) {
          isBlocked = true;
        }
      }
    }

    path.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  }

  path.push([Number(end[1].toFixed(6)), Number(end[0].toFixed(6))]);

  const status: RouteStatus = isBlocked
    ? 'impassable'
    : wasDetoured
    ? 'rerouted'
    : 'clear';

  return { path, status };
}

export function generateSimulationFallback(request: SimulationRequest): SimulationResponse {
  const { flood_zones, parameters } = request;
  const duration = parameters.duration_hours || 6;
  const baseDepth = parameters.flood_depth_meters || 1.2;
  const intensity = parameters.rainfall_intensity_mm_hr || 3;
  const spreadRate = parameters.spread_rate_meters_hr || 180;

  const timeline: TimelineStep[] = [];

  // Default epicenters if none provided
  const primaryCenters: { center: Coordinates; radiusMeters: number; initialDepth: number }[] = [];

  if (flood_zones && flood_zones.length > 0) {
    flood_zones.forEach((fz) => {
      if (fz.type === 'circle' && fz.coordinates.length > 0) {
        primaryCenters.push({
          center: fz.coordinates[0],
          radiusMeters: fz.radius_meters || 2000,
          initialDepth: baseDepth,
        });
      } else if (fz.coordinates.length > 0) {
        let latSum = 0;
        let lonSum = 0;
        fz.coordinates.forEach((c) => {
          latSum += c[0];
          lonSum += c[1];
        });
        primaryCenters.push({
          center: [latSum / fz.coordinates.length, lonSum / fz.coordinates.length],
          radiusMeters: fz.radius_meters || 2200,
          initialDepth: baseDepth,
        });
      }
    });
  } else {
    // Default to Velachery
    primaryCenters.push({
      center: [12.9796, 80.2208],
      radiusMeters: 2200,
      initialDepth: baseDepth,
    });
  }

  // Generate steps for t = 0..duration
  for (let t = 0; t <= duration; t++) {
    const timeRatio = t / Math.max(1, duration);
    const growthMeters = spreadRate * t * (intensity / 3.0);

    // Flood polygons
    const floodFeatures: FloodPolygonFeature[] = [];
    const activeFloodCenters: { center: Coordinates; radiusKm: number }[] = [];

    primaryCenters.forEach((pc, idx) => {
      const currentRadius = pc.radiusMeters + growthMeters;
      activeFloodCenters.push({
        center: pc.center,
        radiusKm: currentRadius / 1000,
      });

      const currentDepth = Number((pc.initialDepth * (0.5 + 0.5 * timeRatio)).toFixed(2));
      let severity: SeverityLevel = 'advisory';
      if (currentDepth >= 1.2) severity = 'catastrophic';
      else if (currentDepth >= 0.6) severity = 'severe';
      else if (currentDepth >= 0.3) severity = 'moderate';

      const polyCoords = (flood_zones[idx] && flood_zones[idx].type === 'polygon' && flood_zones[idx].coordinates.length >= 3)
        ? dilatePolygon(flood_zones[idx].coordinates, 1.0 + (growthMeters / pc.radiusMeters) * 0.7)
        : createCirclePolygonCoordinates(pc.center, currentRadius);

      const styling = SEVERITY_COLORS[severity];

      floodFeatures.push({
        type: 'Feature',
        properties: {
          zone_id: `FZ-${idx + 1}-T${t}`,
          water_depth_m: currentDepth,
          severity,
          fill_color: styling.fill,
          stroke_color: styling.stroke,
          fill_opacity: styling.opacity,
          area_sq_km: Number(((Math.PI * Math.pow(currentRadius / 1000, 2))).toFixed(2)),
        },
        geometry: {
          type: 'Polygon',
          coordinates: polyCoords,
        },
      });
    });

    // Shelter Allocations & Evacuation Routes
    const shelterState: ShelterAllocation[] = CHENNAI_SHELTERS.map((sh) => ({
      shelter_id: sh.id,
      name: sh.name,
      neighborhood: sh.neighborhood,
      coordinates: sh.location,
      total_capacity: sh.capacity,
      current_occupancy: sh.current_occupancy,
      allocated_evacuees: 0,
      remaining_capacity: Math.max(0, sh.capacity - sh.current_occupancy),
      occupancy_pct: Math.round((sh.current_occupancy / sh.capacity) * 100),
      status: 'normal',
      amenities: sh.amenities,
    }));

    const evacuationFeatures: EvacuationRouteFeature[] = [];
    const isolatedClusters: IsolatedCluster[] = [];
    let totalEvacuatedInStep = 0;
    let totalStrandedInStep = 0;
    let severedRoadsCount = 0;

    CHENNAI_POPULATION_CLUSTERS.forEach((cluster) => {
      // Check proximity to flood
      let nearestDist = Infinity;
      primaryCenters.forEach((pc) => {
        const d = haversineDistanceKm(cluster.location, pc.center);
        if (d < nearestDist) nearestDist = d;
      });

      const isInDanger = nearestDist < (primaryCenters[0].radiusMeters + growthMeters) / 1000;
      const evacueeDemand = isInDanger
        ? Math.round(cluster.estimated_population * 0.35 * (0.5 + 0.5 * timeRatio))
        : 0;

      if (evacueeDemand > 0) {
        // Find nearest shelter with available capacity
        let assignedShelter: ShelterAllocation | null = null;
        let bestDist = Infinity;

        shelterState.forEach((sh) => {
          if (sh.remaining_capacity > 0 && sh.coordinates) {
            const dist = haversineDistanceKm(cluster.location, sh.coordinates);
            if (dist < bestDist) {
              bestDist = dist;
              assignedShelter = sh;
            }
          }
        });

        // Check if cut-off
        if (nearestDist < 0.8 && t >= 3) {
          isolatedClusters.push({
            cluster_id: cluster.id,
            name: cluster.name,
            location: cluster.location,
            trapped_population: Math.round(evacueeDemand * 0.4),
            requires_airlift: true,
          });
          totalStrandedInStep += Math.round(evacueeDemand * 0.4);
        }

        if (assignedShelter) {
          const allocCount = Math.min(evacueeDemand, (assignedShelter as ShelterAllocation).remaining_capacity);
          (assignedShelter as ShelterAllocation).allocated_evacuees += allocCount;
          (assignedShelter as ShelterAllocation).remaining_capacity -= allocCount;
          const newOcc = (assignedShelter as ShelterAllocation).current_occupancy + (assignedShelter as ShelterAllocation).allocated_evacuees;
          (assignedShelter as ShelterAllocation).occupancy_pct = Math.min(100, Math.round((newOcc / (assignedShelter as ShelterAllocation).total_capacity) * 100));

          if ((assignedShelter as ShelterAllocation).occupancy_pct >= 95) {
            (assignedShelter as ShelterAllocation).status = 'full';
          } else if ((assignedShelter as ShelterAllocation).occupancy_pct >= 75) {
            (assignedShelter as ShelterAllocation).status = 'near_capacity';
          }

          totalEvacuatedInStep += allocCount;

          if ((assignedShelter as ShelterAllocation).coordinates) {
            const { path, status } = generateSafePath(
              cluster.location,
              (assignedShelter as ShelterAllocation).coordinates!,
              activeFloodCenters
            );

            if (status === 'rerouted') severedRoadsCount += 2;
            if (status === 'impassable') severedRoadsCount += 4;

            evacuationFeatures.push({
              type: 'Feature',
              properties: {
                route_id: `EVAC-${cluster.id}-${(assignedShelter as ShelterAllocation).shelter_id}`,
                source_cluster_id: cluster.id,
                source_name: cluster.name,
                destination_shelter_id: (assignedShelter as ShelterAllocation).shelter_id,
                destination_name: (assignedShelter as ShelterAllocation).name,
                evacuee_count: allocCount,
                distance_km: Number((bestDist * (status === 'rerouted' ? 1.3 : 1.05)).toFixed(1)),
                estimated_time_min: Math.round(bestDist * (status === 'rerouted' ? 5 : 3.5)),
                status,
                color: status === 'rerouted' ? '#F59E0B' : status === 'impassable' ? '#EF4444' : '#10B981',
              },
              geometry: {
                type: 'LineString',
                coordinates: path,
              },
            });
          }
        }
      }
    });

    // Supply Routes from 5 Warehouses to 10 Distribution Points
    const supplyFeatures: SupplyRouteFeature[] = [];
    let allocatedWater = 0;
    let allocatedFood = 0;
    let allocatedMeds = 0;

    CHENNAI_DISTRIBUTION_POINTS.forEach((dp, dpIdx) => {
      // Match with warehouse based on index
      const wh = CHENNAI_WAREHOUSES[dpIdx % CHENNAI_WAREHOUSES.length];
      const dist = haversineDistanceKm(wh.location, dp.location);

      const { path, status } = generateSafePath(wh.location, dp.location, activeFloodCenters);

      const waterCargo = Math.round(dp.demand.water_litres * (0.3 + 0.7 * timeRatio));
      const foodCargo = Math.round(dp.demand.food_rations * (0.3 + 0.7 * timeRatio));
      const medCargo = Math.round(dp.demand.medical_kits * (0.3 + 0.7 * timeRatio));

      allocatedWater += waterCargo;
      allocatedFood += foodCargo;
      allocatedMeds += medCargo;

      supplyFeatures.push({
        type: 'Feature',
        properties: {
          route_id: `SR-${wh.id}-${dp.id}`,
          warehouse_id: wh.id,
          warehouse_name: wh.name,
          destination_id: dp.id,
          destination_name: dp.name,
          distance_km: Number((dist * (status === 'rerouted' ? 1.25 : 1.05)).toFixed(1)),
          transit_time_min: Math.round(dist * 3),
          cargo: {
            water_litres: waterCargo,
            food_rations: foodCargo,
            medical_kits: medCargo,
          },
          status: status === 'impassable' ? 'blocked' : 'active',
          color: status === 'impassable' ? '#EF4444' : '#F97316',
        },
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
      });
    });

    const totalWaterCity = 1080000;
    const totalFoodCity = 285000;
    const totalMedsCity = 13800;

    const inventoryStatus: InventoryStatus = {
      total_water_litres: totalWaterCity,
      allocated_water_litres: allocatedWater,
      available_water_litres: Math.max(0, totalWaterCity - allocatedWater),
      total_food_rations: totalFoodCity,
      allocated_food_rations: allocatedFood,
      available_food_rations: Math.max(0, totalFoodCity - allocatedFood),
      total_medical_kits: totalMedsCity,
      allocated_medical_kits: allocatedMeds,
      available_medical_kits: Math.max(0, totalMedsCity - allocatedMeds),
    };

    timeline.push({
      time_step: t,
      hour: t,
      description:
        t === 0
          ? 'T=0h: Severe meteorological depression detects heavy localized precipitation.'
          : t === 2
          ? 'T=2h: Runoff inundation reaches low-lying basins; arterial detour routes activated.'
          : t === 4
          ? 'T=4h: Peak flood extent; emergency logistics dispatch convoys en route to 10 distribution points.'
          : `T=${t}h: Sustained emergency response operations; shelter allocations actively balancing.`,
      flood_polygons: {
        type: 'FeatureCollection',
        features: floodFeatures,
      },
      evacuation_routes: {
        type: 'FeatureCollection',
        features: evacuationFeatures,
      },
      supply_routes: {
        type: 'FeatureCollection',
        features: supplyFeatures,
      },
      shelter_allocations: shelterState,
      inventory_status: inventoryStatus,
      isolated_clusters: isolatedClusters,
      metrics: {
        total_flooded_area_sq_km: Number((floodFeatures.reduce((acc, f) => acc + (f.properties.area_sq_km || 0), 0)).toFixed(1)),
        total_affected_population: Math.round(18000 + t * 9500 * (intensity / 3)),
        total_evacuated_population: totalEvacuatedInStep,
        unassigned_stranded_population: totalStrandedInStep,
        severed_roads_count: Math.max(3, severedRoadsCount + t * 4),
        active_routes_count: evacuationFeatures.length + supplyFeatures.length,
      },
    });
  }

  const lastStep = timeline[timeline.length - 1];

  return {
    simulation_id: `sim_chn_${Date.now()}`,
    status: 'completed',
    computed_at: new Date().toISOString(),
    timeline,
    summary: {
      total_affected_population: lastStep.metrics.total_affected_population,
      total_evacuated: lastStep.metrics.total_evacuated_population,
      stranded_requiring_rescue: lastStep.metrics.unassigned_stranded_population,
      peak_inundation_hour: Math.min(duration, 4),
      max_flooded_area_sq_km: lastStep.metrics.total_flooded_area_sq_km,
      shelter_overall_utilization_pct: Math.round(
        (lastStep.shelter_allocations.reduce((acc, s) => acc + s.current_occupancy + s.allocated_evacuees, 0) /
          lastStep.shelter_allocations.reduce((acc, s) => acc + s.total_capacity, 0)) *
          100
      ),
    },
  };
}

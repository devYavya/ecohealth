// // src/utils/carbonLogic.js

// // Define emission values in kg CO2e per day for each option
// const carbonEmissionMapping = {
//   transportMode: {
//     public_transport: 1.2,
//     car: 4.8,
//     bike: 0.5,
//     walk: 0.1,
//     electric_vehicle: 2.0,
//   },
//   dietType: {
//     vegan: 1.5,
//     vegetarian: 2.0,
//     non_veg: 5.0,
//     eggetarian: 3.0,
//   },
//   electricityUsage: {
//     "0-2_hours_ac": 1.0,
//     "2-4_hours_ac": 2.0,
//     "4-6_hours_ac": 3.5,
//     "6+_hours_ac": 5.0,
//     // Simplified daily log values
//     low: 1.0,
//     medium: 2.5,
//     high: 4.0,
//   },
//   digitalHours: {
//     "0-2_hours": 0.3,
//     "2-4_hours": 0.6,
//     "4-6_hours": 1.0,
//     "6+_hours": 1.5,
//     "8+_hours": 2.0,
//     // Simplified daily log values
//     low: 0.4,
//     medium: 1.0,
//     high: 1.8,
//   },
// };

// // Function to calculate total CO2e based on onboarding answers
// export function calculateCarbonFootprint(onboardingData) {
//   let totalCarbon = 0;

//   for (const [key, value] of Object.entries(onboardingData)) {
//     if (carbonEmissionMapping[key] && carbonEmissionMapping[key][value]) {
//       totalCarbon += carbonEmissionMapping[key][value];
//     }
//   }

//   return parseFloat(totalCarbon.toFixed(2)); // Return with 2 decimal precision
// }

// // Function to calculate carbon footprint from daily log
// export function calculateCarbonFootprintFromDailyLog(dailyLogData) {
//   let totalCarbon = 0;

//   // Map daily log field names to carbon emission mapping keys
//   const fieldMapping = {
//     transportInput: "transportMode",
//     dietInput: "dietType",
//     electricityInput: "electricityUsage",
//     digitalInput: "digitalHours",
//   };

//   for (const [logField, logValue] of Object.entries(dailyLogData)) {
//     const mappingKey = fieldMapping[logField];
//     if (
//       mappingKey &&
//       carbonEmissionMapping[mappingKey] &&
//       carbonEmissionMapping[mappingKey][logValue]
//     ) {
//       totalCarbon += carbonEmissionMapping[mappingKey][logValue];
//     }
//   }

//   return parseFloat(totalCarbon.toFixed(2));
// }

// Comprehensive 15-question carbon footprint mapping
const carbonEmissionMapping = {
  // Q1: Primary transport mode
  primaryTransport: {
    car_daily: 8.5,
    public_transport: 2.3,
    bike_scooter: 1.2,
    walking: 0.0,
    electric_vehicle: 3.1,
    work_from_home: 0.0,
  },

  // Q2: Daily commute distance
  commuteDistance: {
    less_than_5km: 1.0,
    five_to_15km: 2.5,
    fifteen_to_30km: 4.2,
    more_than_30km: 6.8,
  },

  // Q3: Diet type
  dietType: {
    vegan: 1.5,
    vegetarian: 2.3,
    pescatarian: 3.2,
    occasional_meat: 4.1,
    regular_meat: 5.8,
    heavy_meat: 7.2,
  },

  // Q4: Home size
  homeSize: {
    studio_1bhk: 0.8,
    two_bhk: 1.5,
    three_bhk: 2.2,
    four_plus_bhk: 3.1,
    independent_house: 4.0,
  },

  // Q5: AC usage hours
  acUsage: {
    no_ac: 0.0,
    less_than_2hrs: 1.2,
    two_to_4hrs: 2.8,
    four_to_6hrs: 4.2,
    six_to_8hrs: 5.6,
    more_than_8hrs: 7.3,
  },

  // Q6: Digital device usage
  digitalUsage: {
    less_than_2hrs: 0.3,
    two_to_4hrs: 0.7,
    four_to_6hrs: 1.2,
    six_to_8hrs: 1.8,
    eight_to_10hrs: 2.4,
    more_than_10hrs: 3.1,
  },

  // Q7: Shopping frequency
  shoppingFrequency: {
    minimal_necessary: 0.5,
    monthly_planned: 1.2,
    weekly_regular: 2.1,
    frequent_impulse: 3.5,
    daily_shopping: 4.8,
  },

  // Q8: Water usage
  waterUsage: {
    very_conscious: 0.3,
    moderately_conscious: 0.7,
    average_usage: 1.2,
    above_average: 1.8,
    high_usage: 2.5,
  },

  // Q9: Waste management
  wasteManagement: {
    comprehensive_recycling: 0.2,
    basic_segregation: 0.6,
    minimal_effort: 1.1,
    no_segregation: 1.8,
  },

  // Q10: Food waste
  foodWaste: {
    zero_waste: 0.0,
    minimal_waste: 0.4,
    occasional_waste: 0.9,
    regular_waste: 1.5,
    significant_waste: 2.3,
  },

  // Q11: Air travel frequency
  airTravel: {
    never: 0.0,
    once_yearly: 2.1,
    twice_yearly: 4.2,
    quarterly: 8.5,
    monthly: 16.8,
    frequent_flyer: 25.2,
  },

  // Q12: Energy source
  energySource: {
    renewable_solar: 0.2,
    mix_renewable: 0.8,
    grid_efficient: 1.5,
    standard_grid: 2.3,
    coal_heavy: 3.1,
  },

  // Q13: Clothing purchases
  clothingPurchases: {
    minimal_sustainable: 0.3,
    need_based: 0.8,
    seasonal_shopping: 1.5,
    regular_fashion: 2.4,
    frequent_fashion: 3.8,
  },

  // Q14: Exercise/fitness activities
  fitnessActivities: {
    outdoor_natural: 0.1,
    home_workouts: 0.2,
    local_gym_walk: 0.4,
    gym_commute: 0.8,
    fitness_travel: 1.2,
  },

  // Q15: Household appliances usage
  applianceUsage: {
    energy_efficient_minimal: 0.8,
    efficient_moderate: 1.4,
    standard_usage: 2.1,
    high_usage: 2.9,
    excessive_usage: 3.7,
  },
};

const perUnitEmission = {
  transportMode: {
    public_transport: 1.2,
    car: 4.8,
    bike: 0.5,
    walk: 0.0,
    electric_vehicle: 2.0,
  },
  dietType: {
    vegan: 1.5,
    vegetarian: 2.0,
    non_veg: 5.0,
    eggetarian: 3.0,
  },
  electricityUsagePerHour: 0.8,
  digitalUsagePerHour: 0.25,
  carEmissionPerKm: 0.21,
};

// Function to calculate total CO2e based on onboarding answers (15 questions)
export function calculateCarbonFootprint(onboardingData) {
  let totalCarbon = 0;

  for (const [key, value] of Object.entries(onboardingData)) {
    if (carbonEmissionMapping[key] && carbonEmissionMapping[key][value]) {
      totalCarbon += carbonEmissionMapping[key][value];
    }
  }

  return parseFloat(totalCarbon.toFixed(2)); // Return with 2 decimal precision
}

export function calculateWalkingAvoidedCarbon(steps) {
  const stepLengthMeters = 0.762;
  const distanceKm = (steps * stepLengthMeters) / 1000;
  const avoidedCarbon = distanceKm * perUnitEmission.carEmissionPerKm;
  return parseFloat(avoidedCarbon.toFixed(2));
}

export function calculateCarbonFootprintFromDailyLog(log) {
  let total = 0;

  if (
    log.transportInput &&
    perUnitEmission.transportMode[log.transportInput] !== undefined
  ) {
    total += perUnitEmission.transportMode[log.transportInput];
  }

  if (log.dietInput && perUnitEmission.dietType[log.dietInput] !== undefined) {
    total += perUnitEmission.dietType[log.dietInput];
  }

  if (typeof log.electricityUsage === "number") {
    total += log.electricityUsage * perUnitEmission.electricityUsagePerHour;
  }

  if (typeof log.digitalUsage === "number") {
    total += log.digitalUsage * perUnitEmission.digitalUsagePerHour;
  }

  if (
    log.transportInput === "walk" &&
    log.steps &&
    typeof log.steps === "number"
  ) {
    const avoided = calculateWalkingAvoidedCarbon(log.steps);
    total = Math.max(0, total - avoided);
  }

  return parseFloat(total.toFixed(2));
}

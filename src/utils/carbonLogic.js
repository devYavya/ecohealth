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

// Comprehensive Carbon Footprint Calculation System
// Based on Transport, Diet, Electricity, and Lifestyle profiles

// Transport emission factors
const transportEmissions = {
  primaryMode: {
    personal_car: { base: 4.5, fuelMultiplier: true },
    two_wheeler: { base: 2.0, fuelMultiplier: true },
    bus: { base: 1.5, fuelMultiplier: false },
    metro_train: { base: 0.8, fuelMultiplier: false },
    bicycle: { base: 0.0, fuelMultiplier: false },
    walking: { base: 0.0, fuelMultiplier: false },
    work_from_home: { base: 0.0, fuelMultiplier: false },
  },
  fuelType: {
    petrol: 1.0,
    diesel: 1.15,
    cng: 0.7,
    electric: 0.4,
    hybrid: 0.6,
    not_sure: 1.0,
  },
  evChargingSource: {
    home_grid: 1.0,
    public_stations: 1.1,
    renewable: 0.2,
    not_sure: 1.0,
  },
  dailyDistance: {
    "0_5km": 1.0,
    "6_15km": 2.5,
    "16_30km": 4.0,
    "31_50km": 6.0,
    "51plus_km": 8.0,
  },
  passengers: {
    alone: 1.0,
    one_passenger: 0.6,
    two_plus_passengers: 0.4,
    shared_public: 0.3,
  },
  flightsPerYear: {
    0: 0.0,
    "1_2": 8.5, // kg CO2 per day (annual average)
    "3_5": 21.0,
    "6plus": 42.0,
  },
  mileage: {
    low: 1.3, // <10 km/l
    average: 1.0, // 10-15 km/l
    good: 0.7, // 16-25 km/l
    excellent: 0.5, // 25+ km/l or EV
    not_sure: 1.0,
  },
};

// Diet emission factors
const dietEmissions = {
  mealTypes: {
    meat_based: 4.5, // kg CO2 per meal
    dairy_egg_based: 1.2,
    plant_based: 0.5,
  },
  orderedMealsMultiplier: 2.0, // Additional CF for delivery
  orderedMealsPerWeek: {
    never: 0.0,
    "1_2_week": 0.3, // meals per day
    "3_5_week": 0.6,
    "6_9_week": 1.0,
    "10_15_week": 1.8,
    "16_20_week": 2.5,
    "20plus_week": 3.0,
  },
  junkFoodMultiplier: {
    daily: 1.2,
    few_times_week: 1.1,
    occasionally: 1.05,
    rarely_never: 1.0,
  },
  wasteMultiplier: {
    never: 1.0,
    rarely: 1.05,
    sometimes: 1.15,
    often: 1.25,
  },
};

// Electricity emission factors
const electricityEmissions = {
  emissionFactors: {
    mostly_renewable: 0.1, // kg CO2 per kWh
    partially_renewable: 0.5,
    no_renewable: 0.9,
    not_sure: 0.9,
  },
  usageEstimates: {
    less_100: 75, // kWh per month
    "100_200": 150,
    "200_400": 300,
    "400_600": 500,
    "600plus": 700,
  },
  timeAtHomeMultiplier: {
    "4_hours_less": 0.5,
    "5_8_hours": 0.7,
    "9_12_hours": 0.9,
    "12plus_hours": 1.0,
  },
  appliances: {
    air_conditioner: 60, // kWh per month
    geyser: 30,
    refrigerator: 40,
    washing_machine: 15,
    microwave: 10,
    laptop_desktop: 20,
    tv_console: 15,
  },
};

// Lifestyle emission factors
const lifestyleEmissions = {
  screenTime: {
    less_2hrs: 1, // kg CO2 per week
    "2_4hrs": 2,
    "4_6hrs": 3,
    "6plus_hrs": 4,
  },
  nonEssentialShopping: {
    weekly: 10, // kg CO2 per month
    few_times_month: 6,
    monthly: 3,
    rarely_never: 0,
  },
  fashionShopping: {
    more_once_month: 8,
    every_1_2_months: 5,
    every_3plus_months: 2,
    rarely_never: 0,
  },
  onlineOrders: {
    0: 0, // kg CO2 per month
    "1_5": 2,
    "6_10": 4,
    "11_15": 6,
    "15plus": 8,
  },
  wasteManagement: {
    recycle_compost: 0.8, // multiplier
    recycle_some: 0.9,
    throw_everything: 1.1,
    not_sure: 1.0,
  },
};

// Transport Carbon Footprint Calculation
function calculateTransportCF(transportData) {
  const {
    primaryMode,
    fuelType,
    evChargingSource,
    dailyDistance,
    passengers,
    flightsPerYear,
    mileage,
  } = transportData;

  let dailyCF = 0;

  // Base transport emissions
  const modeData = transportEmissions.primaryMode[primaryMode];
  if (modeData) {
    dailyCF = modeData.base;

    // Apply fuel type multiplier for vehicles
    if (modeData.fuelMultiplier && fuelType) {
      const fuelMultiplier = transportEmissions.fuelType[fuelType] || 1.0;
      dailyCF *= fuelMultiplier;

      // Apply EV charging source if electric
      if (fuelType === "electric" && evChargingSource) {
        const chargingMultiplier =
          transportEmissions.evChargingSource[evChargingSource] || 1.0;
        dailyCF *= chargingMultiplier;
      }

      // Apply mileage factor for efficiency
      if (mileage && mileage !== "not_sure") {
        const mileageMultiplier = transportEmissions.mileage[mileage] || 1.0;
        dailyCF *= mileageMultiplier;
      }
    }

    // Apply distance multiplier
    if (dailyDistance) {
      const distanceMultiplier =
        transportEmissions.dailyDistance[dailyDistance] || 1.0;
      dailyCF *= distanceMultiplier;
    }

    // Apply passenger sharing benefit
    if (passengers) {
      const passengerMultiplier =
        transportEmissions.passengers[passengers] || 1.0;
      dailyCF *= passengerMultiplier;
    }
  }

  // Add flight emissions (annual average per day)
  if (flightsPerYear) {
    const flightCF = transportEmissions.flightsPerYear[flightsPerYear] || 0;
    dailyCF += flightCF;
  }

  return parseFloat(dailyCF.toFixed(2));
}

// Diet Carbon Footprint Calculation
function calculateDietCF(dietData) {
  const {
    mealsPerDay,
    meatPercentage,
    dairyPercentage,
    plantPercentage,
    orderedMealsFreq,
    junkFoodFreq,
    foodWaste,
  } = dietData;

  // Calculate base meal CF based on composition
  const meatCF = (meatPercentage / 100) * dietEmissions.mealTypes.meat_based;
  const dairyCF =
    (dairyPercentage / 100) * dietEmissions.mealTypes.dairy_egg_based;
  const plantCF = (plantPercentage / 100) * dietEmissions.mealTypes.plant_based;

  const cfPerMeal = meatCF + dairyCF + plantCF;
  let dailyCF = cfPerMeal * mealsPerDay;

  // Add delivery/ordered meals CF
  if (orderedMealsFreq) {
    const orderedMealsPerDay =
      dietEmissions.orderedMealsPerWeek[orderedMealsFreq] || 0;
    const deliveryCF =
      orderedMealsPerDay * dietEmissions.orderedMealsMultiplier;
    dailyCF += deliveryCF;
  }

  // Apply junk food multiplier
  if (junkFoodFreq) {
    const junkMultiplier =
      dietEmissions.junkFoodMultiplier[junkFoodFreq] || 1.0;
    dailyCF *= junkMultiplier;
  }

  // Apply food waste multiplier
  if (foodWaste) {
    const wasteMultiplier = dietEmissions.wasteMultiplier[foodWaste] || 1.0;
    dailyCF *= wasteMultiplier;
  }

  return parseFloat(dailyCF.toFixed(2));
}

// Electricity Carbon Footprint Calculation
function calculateElectricityCF(electricityData) {
  const { monthlyKwh, householdSize, timeAtHome, appliances, renewableEnergy } =
    electricityData;

  // Get emission factor based on renewable usage
  const emissionFactor =
    electricityEmissions.emissionFactors[renewableEnergy] || 0.9;

  // Calculate base monthly CF
  let monthlyCF = monthlyKwh * emissionFactor;

  // Allocate per person
  const perPersonCF = monthlyCF / householdSize;

  // Adjust based on time at home
  const timeMultiplier =
    electricityEmissions.timeAtHomeMultiplier[timeAtHome] || 1.0;
  let adjustedCF = perPersonCF * timeMultiplier;

  // Add appliance-specific emissions
  let applianceCF = 0;
  if (appliances && Array.isArray(appliances)) {
    appliances.forEach((appliance) => {
      const applianceKwh = electricityEmissions.appliances[appliance] || 0;
      applianceCF += applianceKwh * emissionFactor;
    });
  }

  const totalMonthlyCF = adjustedCF + applianceCF;
  const dailyCF = totalMonthlyCF / 30; // Convert to daily

  return parseFloat(dailyCF.toFixed(2));
}

// Lifestyle Carbon Footprint Calculation
function calculateLifestyleCF(lifestyleData) {
  const {
    screenTime,
    nonEssentialShopping,
    fashionShopping,
    onlineOrders,
    wasteManagement,
  } = lifestyleData;

  let monthlyCF = 0;

  // Screen time emissions (weekly to monthly)
  if (screenTime) {
    const weeklyScreenCF = lifestyleEmissions.screenTime[screenTime] || 0;
    monthlyCF += weeklyScreenCF * 4.33; // weeks per month
  }

  // Shopping emissions
  if (nonEssentialShopping) {
    monthlyCF +=
      lifestyleEmissions.nonEssentialShopping[nonEssentialShopping] || 0;
  }

  if (fashionShopping) {
    monthlyCF += lifestyleEmissions.fashionShopping[fashionShopping] || 0;
  }

  if (onlineOrders) {
    monthlyCF += lifestyleEmissions.onlineOrders[onlineOrders] || 0;
  }

  // Apply waste management multiplier
  if (wasteManagement) {
    const wasteMultiplier =
      lifestyleEmissions.wasteManagement[wasteManagement] || 1.0;
    monthlyCF *= wasteMultiplier;
  }

  const dailyCF = monthlyCF / 30; // Convert to daily
  return parseFloat(dailyCF.toFixed(2));
}

// Main carbon footprint calculation function
export function calculateCarbonFootprint(onboardingData) {
  const breakdown = {};

  // Calculate each profile's contribution
  if (onboardingData.transport) {
    breakdown.transport = calculateTransportCF(onboardingData.transport);
  } else {
    breakdown.transport = 0;
  }

  if (onboardingData.diet) {
    breakdown.diet = calculateDietCF(onboardingData.diet);
  } else {
    breakdown.diet = 0;
  }

  if (onboardingData.electricity) {
    breakdown.electricity = calculateElectricityCF(onboardingData.electricity);
  } else {
    breakdown.electricity = 0;
  }

  if (onboardingData.lifestyle) {
    breakdown.lifestyle = calculateLifestyleCF(onboardingData.lifestyle);
  } else {
    breakdown.lifestyle = 0;
  }

  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return {
    total: parseFloat(total.toFixed(2)),
    breakdown: {
      transport: parseFloat(breakdown.transport.toFixed(2)),
      diet: parseFloat(breakdown.diet.toFixed(2)),
      electricity: parseFloat(breakdown.electricity.toFixed(2)),
      lifestyle: parseFloat(breakdown.lifestyle.toFixed(2)),
    },
  };
}

// Daily log carbon footprint calculation
export function calculateCarbonFootprintFromDailyLog(dailyLogData) {
  let dailyCF = 0;

  // Transport daily override
  if (dailyLogData.transport) {
    const { totalDistance, primaryMode } = dailyLogData.transport;

    if (primaryMode && totalDistance) {
      const modeData = transportEmissions.primaryMode[primaryMode];
      if (modeData) {
        const distanceMultiplier =
          transportEmissions.dailyDistance[totalDistance] || 1.0;
        dailyCF += modeData.base * distanceMultiplier;
      }
    }
  }

  // Diet daily override
  if (dailyLogData.diet) {
    const { mealsToday, meatMeals, ateOutside } = dailyLogData.diet;

    // Calculate based on actual meals eaten
    const meatMealsCF = meatMeals * dietEmissions.mealTypes.meat_based;
    const vegMealsCF =
      (mealsToday - meatMeals) * dietEmissions.mealTypes.plant_based;
    dailyCF += meatMealsCF + vegMealsCF;

    // Add delivery CF if ordered food
    if (ateOutside) {
      dailyCF += dietEmissions.orderedMealsMultiplier;
    }
  }

  // Electricity daily override
  if (dailyLogData.electricity) {
    const { acHours, appliances, workedFromHome } = dailyLogData.electricity;

    let dailyElectricityCF = 0;

    // AC usage
    if (acHours && acHours !== "0") {
      const acHourMap = { less_2: 1, "2_4": 3, "4plus": 6 };
      const hours = acHourMap[acHours] || 0;
      dailyElectricityCF += hours * 2.0 * 0.9; // 2kWh per hour * emission factor
    }

    // High power appliances
    if (appliances && Array.isArray(appliances)) {
      appliances.forEach((appliance) => {
        const dailyKwh = (electricityEmissions.appliances[appliance] || 0) / 30;
        dailyElectricityCF += dailyKwh * 0.9;
      });
    }

    // Work from home extra usage
    if (workedFromHome) {
      dailyElectricityCF += 2.0; // Extra 2kg CO2 for WFH
    }

    dailyCF += dailyElectricityCF;
  }

  // Lifestyle daily override
  if (dailyLogData.lifestyle) {
    const { onlineOrders, screenHours, recycledWaste } = dailyLogData.lifestyle;

    let dailyLifestyleCF = 0;

    // Online orders
    if (onlineOrders) {
      dailyLifestyleCF += 2.0; // 2kg CO2 per order
    }

    // Screen time
    if (screenHours) {
      const screenCFMap = {
        less_2: 0.14,
        "2_4": 0.28,
        "4_6": 0.43,
        "6plus": 0.57,
      };
      dailyLifestyleCF += screenCFMap[screenHours] || 0;
    }

    // Waste management benefit
    if (recycledWaste) {
      dailyLifestyleCF *= 0.8; // 20% reduction for recycling
    }

    dailyCF += dailyLifestyleCF;
  }

  return parseFloat(dailyCF.toFixed(2));
}

export function calculateDailyOverride(userProfile, overrideData) {
  // Calculate carbon footprint with daily overrides applied to user's baseline profile

  // Create a modified profile with overrides applied
  const modifiedProfile = {
    transport: { ...userProfile.transport, ...overrideData.transport },
    diet: { ...userProfile.diet, ...overrideData.diet },
    electricity: { ...userProfile.electricity, ...overrideData.electricity },
    lifestyle: { ...userProfile.lifestyle, ...overrideData.lifestyle },
  };

  // Use the main calculation function with the modified profile
  return calculateCarbonFootprint(modifiedProfile);
}

export function calculateWalkingAvoidedCarbon(steps) {
  const stepLengthMeters = 0.762;
  const distanceKm = (steps * stepLengthMeters) / 1000;
  const avoidedCarbon = distanceKm * 0.21; // Car emission per km
  return parseFloat(avoidedCarbon.toFixed(2));
}

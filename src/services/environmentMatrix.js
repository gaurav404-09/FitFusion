export function getSimulatedEnvironment(timeOfDay = new Date()) {
  const date =
    typeof timeOfDay === "string" ? new Date(timeOfDay) : timeOfDay ?? new Date();

  if (Number.isNaN(date.getTime())) {
    return {
      zone: "Central Library",
      noise: "40dB",
      crowding: "20%",
    };
  }

  const minutes = date.getHours() * 60 + date.getMinutes();

  // 13:00 - 14:30 → Hostel Mess (very loud and crowded)
  if (minutes >= 13 * 60 && minutes <= 14 * 60 + 30) {
    return {
      zone: "Hostel Mess",
      noise: "85dB",
      crowding: "95%",
    };
  }

  // 18:00 - 20:00 → Main Gym (busy training window)
  if (minutes >= 18 * 60 && minutes <= 20 * 60) {
    return {
      zone: "Main Gym",
      noise: "75dB",
      crowding: "90%",
    };
  }

  // Default: Central Library as a quiet fallback space
  return {
    zone: "Central Library",
    noise: "40dB",
    crowding: "20%",
  };
}


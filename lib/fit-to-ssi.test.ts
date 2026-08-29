import { describe, expect, it } from "vitest";
import { fitDataToSsiData, ssiDataToQrPayload, type SsiData } from "./fit-to-ssi";

/** Convert decimal degrees to FIT semicircles. */
function toSemicircles(degrees: number): number {
  return Math.round(degrees * (2147483648 / 180));
}

function baseSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    startTime: new Date("2024-06-15T10:30:00Z"),
    totalTimerTime: 2700, // 45 minutes
    ...overrides,
  };
}

describe("fitDataToSsiData", () => {
  it("returns null when session message is missing", () => {
    expect(fitDataToSsiData({})).toBeNull();
  });

  it("returns null when startTime is missing", () => {
    expect(
      fitDataToSsiData({
        sessionMesgs: [{ totalTimerTime: 600 }],
      })
    ).toBeNull();
  });

  it("maps core dive fields from session and dive summary", () => {
    const dive = fitDataToSsiData(
      {
        sessionMesgs: [baseSession()],
        diveSummaryMesgs: [
          {
            bottomTime: 2520, // 42 minutes preferred over session timer
            maxDepth: 28.46,
            avgDepth: 14.2,
            surfaceInterval: 3600,
          },
        ],
        diveSettingsMesgs: [{ waterType: "saltwater" }],
        diveGasMesgs: [{ oxygenContent: 32 }],
        lapMesgs: [{ avgTemperature: 27, maxTemperature: 28 }],
      },
      { fallbackTimeZone: "UTC" }
    );

    expect(dive).toMatchObject({
      dive: true,
      noid: true,
      dive_type: 0,
      divetime: 42,
      datetime: "202406151030",
      depth_m: 28.5,
      avg_depth_m: 14.2,
      var_watertype_id: 5,
      nitrox_pct: 32,
      surface_interval_s: 3600,
      watertemp_c: 27,
      watertemp_max_c: 28,
    });
  });

  it("uses session timer when dive summary bottomTime is absent", () => {
    const dive = fitDataToSsiData(
      {
        sessionMesgs: [baseSession({ totalTimerTime: 1800 })],
      },
      { fallbackTimeZone: "UTC" }
    );

    expect(dive?.divetime).toBe(30);
  });

  it("maps fresh water type", () => {
    const dive = fitDataToSsiData(
      {
        sessionMesgs: [baseSession()],
        diveSettingsMesgs: [{ waterType: "Fresh Water" }],
      },
      { fallbackTimeZone: "UTC" }
    );

    expect(dive?.var_watertype_id).toBe(4);
  });

  it("derives max depth from record samples when summary depths are missing", () => {
    const dive = fitDataToSsiData(
      {
        sessionMesgs: [baseSession()],
        recordMesgs: [{ depth: 10 }, { depth: 22.5 }, { depth: 18 }],
      },
      { fallbackTimeZone: "UTC" }
    );

    expect(dive?.depth_m).toBe(22.5);
    expect(dive?.avg_depth_m).toBe(16.8);
  });

  it("infers lat/lon and formats datetime in dive timezone", () => {
    // Roughly Hong Kong
    const lat = toSemicircles(22.3193);
    const lon = toSemicircles(114.1694);
    const dive = fitDataToSsiData({
      sessionMesgs: [
        baseSession({
          startTime: new Date("2024-06-15T02:30:00Z"), // 10:30 HKT
          endPositionLat: lat,
          endPositionLong: lon,
        }),
      ],
    });

    expect(dive?.lat_deg).toBeCloseTo(22.3193, 3);
    expect(dive?.lon_deg).toBeCloseTo(114.1694, 3);
    expect(dive?.datetime).toBe("202406151030");
  });

  it("falls back to client timezone when coordinates are missing", () => {
    const dive = fitDataToSsiData(
      {
        sessionMesgs: [
          baseSession({
            startTime: new Date("2024-01-01T00:00:00Z"),
          }),
        ],
      },
      { fallbackTimeZone: "America/New_York" }
    );

    // EST (UTC-5): 2023-12-31 19:00
    expect(dive?.datetime).toBe("202312311900");
  });
});

describe("ssiDataToQrPayload", () => {
  it("serializes markers and key:value fields, skipping undefined", () => {
    const data: SsiData = {
      dive: true,
      noid: true,
      dive_type: 0,
      divetime: 42,
      datetime: "202406151030",
      depth_m: 28.5,
      avg_depth_m: 14.2,
      var_weather_id: 1,
      var_entry_id: 22,
      watertemp_c: 27,
      // display-only fields should not appear in QR
      nitrox_pct: 32,
      lat_deg: 22.3,
      lon_deg: 114.2,
      surface_interval_s: 3600,
    };

    expect(ssiDataToQrPayload(data)).toBe(
      "dive;noid;dive_type:0;divetime:42;datetime:202406151030;depth_m:28.5;var_weather_id:1;var_entry_id:22;watertemp_c:27"
    );
  });

  it("omits dive/noid markers when falsey", () => {
    const data: SsiData = {
      dive_type: 0,
      divetime: 10,
      datetime: "202401011200",
      depth_m: 5,
      avg_depth_m: 3,
    };

    expect(ssiDataToQrPayload(data)).toBe(
      "dive_type:0;divetime:10;datetime:202401011200;depth_m:5"
    );
  });
});

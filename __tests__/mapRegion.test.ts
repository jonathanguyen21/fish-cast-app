import { regionForSpots } from '../features/spots/mapRegion'

describe('regionForSpots', () => {
  it('returns a sensible default region when there are no spots', () => {
    const region = regionForSpots([])
    expect(region.latitude).toBeCloseTo(38.33)
    expect(region.longitude).toBeCloseTo(-123.05)
    expect(region.latitudeDelta).toBeGreaterThan(0)
    expect(region.longitudeDelta).toBeGreaterThan(0)
  })

  it('centers on the single spot with a floor delta, not zero', () => {
    const region = regionForSpots([{ lat: 37.6, lng: -122.5 }])
    expect(region.latitude).toBeCloseTo(37.6)
    expect(region.longitude).toBeCloseTo(-122.5)
    expect(region.latitudeDelta).toBeGreaterThanOrEqual(0.08)
    expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.08)
  })

  it('centers on the bounding box midpoint for multiple spots', () => {
    const region = regionForSpots([
      { lat: 37.0, lng: -122.0 },
      { lat: 39.0, lng: -124.0 },
    ])
    expect(region.latitude).toBeCloseTo(38.0)
    expect(region.longitude).toBeCloseTo(-123.0)
  })

  it('pads the delta beyond the raw bounding box so pins have breathing room', () => {
    const region = regionForSpots([
      { lat: 37.0, lng: -122.0 },
      { lat: 39.0, lng: -124.0 },
    ])
    // raw box is 2.0 degrees each way; padded should be visibly larger
    expect(region.latitudeDelta).toBeGreaterThan(2.0)
    expect(region.longitudeDelta).toBeGreaterThan(2.0)
  })

  it('handles spots that are all at the same coordinate without a zero delta', () => {
    const region = regionForSpots([
      { lat: 40.0, lng: -70.0 },
      { lat: 40.0, lng: -70.0 },
    ])
    expect(region.latitudeDelta).toBeGreaterThanOrEqual(0.08)
    expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.08)
  })
})

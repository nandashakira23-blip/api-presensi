-- Update office location to Bali coordinates
-- User location: -8.4000271, 115.5430133

UPDATE pengaturan 
SET 
  lat_kantor = -8.4000271,
  long_kantor = 115.5430133,
  radius_meter = 100
WHERE id = 1;

-- Verify the update
SELECT 
  lat_kantor as latitude,
  long_kantor as longitude,
  radius_meter as radius_meters
FROM pengaturan 
LIMIT 1;

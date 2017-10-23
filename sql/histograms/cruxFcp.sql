#standardSQL
SELECT
  IF(form_factor.name = 'desktop', 'desktop', 'mobile') AS client,
  bin.start AS bin,
  SUM(bin.density) / 10000 AS volume
FROM (
  SELECT
    form_factor,
    first_contentful_paint.histogram.bin AS bins
  FROM
    `chrome-ux-report.chrome_ux_report.201710`)
CROSS JOIN
  UNNEST(bins) AS bin
GROUP BY
  client,
  bin
ORDER BY
  client,
  bin
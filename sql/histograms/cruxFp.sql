#standardSQL
SELECT
  *,
  SUM(pdf) OVER (PARTITION BY client ORDER BY bin) AS cdf
FROM (
  SELECT
    *,
    volume / SUM(volume) OVER (PARTITION BY client) AS pdf
  FROM (
    SELECT
      IF(form_factor.name = 'desktop', 'desktop', 'mobile') AS client,
      bin.start / 1000 AS bin,
      SUM(bin.density) AS volume
    FROM (
      SELECT
        form_factor,
        first_paint.histogram.bin AS bins
      FROM
        `chrome-ux-report.chrome_ux_report.201710`)
    CROSS JOIN
      UNNEST(bins) AS bin
    GROUP BY
      bin,
      client ) )
ORDER BY
  bin,
  client
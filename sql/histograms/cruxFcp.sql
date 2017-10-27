#standardSQL
CREATE TEMPORARY FUNCTION spreadBins(bins ARRAY<STRUCT<start INT64, `end` INT64, density FLOAT64>>)
RETURNS ARRAY<STRUCT<client STRING, start INT64, density FLOAT64>>
LANGUAGE js AS """
  // Convert into 100ms bins and spread the density around.
  const WIDTH = 100;
  return (bins || []).reduce((bins, bin) => {
    bin.start = +bin.start;
    bin.end = Math.min(bin.end, bin.start + 5000);
    const binWidth = bin.end - bin.start;
    for (let start = bin.start; start < bin.end; start += WIDTH) {
      bins.push({
        start,
        density: bin.density / (binWidth / WIDTH)
      });
    }
    return bins;
  }, []);
""";

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
        spreadBins(first_contentful_paint.histogram.bin) AS bins
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
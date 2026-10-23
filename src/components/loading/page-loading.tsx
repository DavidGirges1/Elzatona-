import motion from "./motion.json";

function Frame({ moving = false }: { moving?: boolean }) {
  return (
    <svg
      className={moving ? "page-loading-motion" : "page-loading-static"}
      viewBox={motion.viewBox}
      focusable="false"
    >
      {moving && <style>{motion.css}</style>}
      <g style={{ isolation: "isolate" }}>
        {motion.layers.map((layer, i) => (
          <g
            key={i}
            data-motion={moving ? i : undefined}
            transform={moving ? undefined : `translate(${layer.start})`}
            style={{
              mixBlendMode: "overlay",
              ...(moving
                ? {
                    offsetPath: `path("${layer.path}")`,
                    offsetRotate: "0deg",
                    offsetAnchor: "0px 0px",
                    animation: `ez-loading-orbit-${i} ${motion.duration} cubic-bezier(${layer.keySplines.split(";")[0].replaceAll(" ", ",")}) infinite`,
                  }
                : {}),
            }}
          >
            <g transform={layer.transform}>
              <circle cx="0" cy="0" r={layer.radius} fill={layer.fill} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <div className="page-loading-visual" aria-hidden="true">
        <Frame moving />
        <Frame />
      </div>
      <p>جاري تحميل الصفحة…</p>
    </div>
  );
}

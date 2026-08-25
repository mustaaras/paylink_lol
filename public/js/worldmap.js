/**
 * paylink.lol — 2D Panoramic Map & 3D Interactive Rotating Globe Engine
 * Desktop: Wide 2D Vector & Matrix World Map with Live Beacons
 * Mobile (<768px): 3D Rotating Holographic Globe with Touch Spin Physics & 3D Beacons
 */

(function () {
  'use strict';

  // High-precision continent polygon paths (equirectangular [lng, lat] coordinates)
  const CONTINENT_POLYGONS = [
    // North America
    [
      [-168, 65], [-160, 71], [-140, 70], [-130, 69], [-120, 69], [-95, 73], [-80, 70], [-65, 60],
      [-60, 52], [-65, 44], [-70, 42], [-75, 35], [-80, 25], [-81, 25], [-80, 30], [-85, 30],
      [-90, 30], [-97, 26], [-97, 20], [-88, 16], [-83, 10], [-77, 8], [-80, 7], [-85, 12],
      [-92, 15], [-105, 20], [-115, 30], [-122, 37], [-124, 48], [-130, 55], [-140, 60], [-150, 60],
      [-160, 58], [-168, 65]
    ],
    // Greenland
    [
      [-45, 60], [-35, 65], [-20, 75], [-25, 82], [-45, 83], [-58, 78], [-55, 70], [-45, 60]
    ],
    // South America
    [
      [-77, 8], [-72, 12], [-60, 10], [-50, 2], [-35, -5], [-35, -12], [-40, -22], [-48, -28],
      [-53, -33], [-60, -40], [-65, -50], [-70, -55], [-75, -50], [-73, -40], [-71, -30], [-76, -15],
      [-80, -2], [-77, 8]
    ],
    // Europe & Scandinavia
    [
      [-9, 36], [-9, 43], [-1, 44], [-5, 48], [-2, 50], [5, 53], [8, 55], [12, 56],
      [10, 60], [5, 62], [15, 68], [25, 71], [30, 70], [35, 65], [30, 60], [25, 55],
      [20, 45], [25, 40], [28, 41], [22, 38], [15, 38], [14, 41], [10, 44], [0, 40],
      [-5, 36], [-9, 36]
    ],
    // UK & Ireland
    [
      [-10, 51], [-6, 55], [-8, 58], [-4, 58], [-2, 53], [-1, 51], [-5, 50], [-10, 51]
    ],
    // Africa
    [
      [-17, 15], [-17, 21], [-13, 28], [-5, 36], [10, 37], [25, 32], [32, 31], [35, 27],
      [42, 12], [51, 12], [45, 0], [40, -10], [35, -25], [32, -30], [28, -34], [18, -34],
      [12, -20], [10, -5], [5, 5], [-5, 5], [-15, 10], [-17, 15]
    ],
    // Madagascar
    [
      [44, -12], [50, -13], [50, -25], [44, -25], [44, -12]
    ],
    // Asia
    [
      [28, 41], [35, 42], [40, 38], [50, 40], [55, 25], [60, 25], [68, 25], [70, 20],
      [78, 8], [80, 10], [88, 22], [92, 18], [100, 10], [104, 2], [108, 14], [118, 22],
      [122, 30], [128, 38], [130, 42], [135, 48], [140, 52], [142, 58], [150, 60], [160, 55],
      [170, 65], [175, 70], [140, 75], [110, 76], [80, 74], [60, 68], [50, 60], [40, 55],
      [35, 50], [28, 41]
    ],
    // Japan
    [
      [130, 32], [132, 34], [136, 36], [140, 40], [142, 44], [145, 44], [141, 38], [135, 34], [130, 32]
    ],
    // SE Asia Islands
    [
      [95, 5], [105, -5], [115, -8], [125, -8], [120, 2], [110, 5], [95, 5]
    ],
    [
      [120, 15], [126, 18], [125, 8], [120, 8], [120, 15]
    ],
    // Australia
    [
      [114, -22], [118, -35], [135, -35], [145, -38], [150, -35], [153, -28], [148, -20],
      [142, -11], [136, -12], [130, -14], [124, -16], [114, -22]
    ],
    // New Zealand
    [
      [166, -46], [172, -41], [178, -37], [175, -42], [168, -47], [166, -46]
    ]
  ];

  // Default seed visitor hubs
  const DEFAULT_VISITOR_HUBS = [
    { id: 'hub_sf', lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'United States', countryCode: 'US', count: 3 },
    { id: 'hub_ny', lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States', countryCode: 'US', count: 4 },
    { id: 'hub_ldn', lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom', countryCode: 'GB', count: 6 },
    { id: 'hub_ber', lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'Germany', countryCode: 'DE', count: 2 },
    { id: 'hub_tok', lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', countryCode: 'JP', count: 5 },
    { id: 'hub_sin', lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', countryCode: 'SG', count: 2 },
    { id: 'hub_syd', lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', countryCode: 'AU', count: 1 }
  ];

  function isPointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  class WorldMapHero {
    constructor() {
      this.canvas = document.getElementById('hero-world-map');
      this.container = document.getElementById('hero-map-container');
      this.tooltip = document.getElementById('hero-map-tooltip');
      if (!this.canvas || !this.container) return;

      this.ctx = this.canvas.getContext('2d');
      this.locations = [...DEFAULT_VISITOR_HUBS];
      this.landDots = [];
      this.arcs = [];
      this.hoveredLocation = null;
      this.mousePos = { x: -1000, y: -1000 };
      this.animFrameId = null;
      this.width = 0;
      this.height = 0;
      this.dpr = window.devicePixelRatio || 1;
      this.theme = document.documentElement.getAttribute('data-theme') || 'dark';

      // 3D Globe Physics & State
      this.globeAngle = 0; // Rotation around Y-axis
      this.globeTilt = 0.22; // ~13 deg axial tilt
      this.isDragging = false;
      this.lastTouchX = 0;
      this.dragVelocity = 0;
      this.lastFrameTime = performance.now();

      this.initHighResLandDots();
      this.bindEvents();
      this.resize();
      this.updateArcs();
      this.startAnimationLoop();
      this.initClientLocationPing();
    }

    initHighResLandDots() {
      this.landDots = [];
      const stepLng = 2.4;
      const stepLat = 2.2;

      for (let lat = -55; lat <= 75; lat += stepLat) {
        for (let lng = -170; lng <= 175; lng += stepLng) {
          const pt = [lng, lat];
          let inside = false;

          for (const poly of CONTINENT_POLYGONS) {
            if (isPointInPolygon(pt, poly)) {
              inside = true;
              break;
            }
          }

          if (inside) {
            this.landDots.push({ lat, lng });
          }
        }
      }
    }

    /**
     * 2D Panoramic Equirectangular Projection
     */
    geoTo2D(lat, lng) {
      const paddingX = this.width * 0.05;
      const paddingY = this.height * 0.08;
      const mapW = this.width - paddingX * 2;
      const mapH = this.height - paddingY * 2;

      const x = paddingX + ((lng + 180) / 360) * mapW;
      const y = paddingY + ((90 - lat) / 180) * mapH;
      return { x, y, visible: true, z: 1 };
    }

    /**
     * Get 3D Globe position & radius dynamically centered behind Hero Title, above paste box
     */
    get3DGlobeMetrics() {
      const cx = this.width / 2;
      const titleEl = document.querySelector('.hero-title');
      const submitBox = document.getElementById('quick-submit-section');

      // Top position: perfectly centered behind the Hero Title & Pill, safely above the paste box
      let cy = 105;
      if (titleEl && this.container) {
        const containerRect = this.container.getBoundingClientRect();
        const titleRect = titleEl.getBoundingClientRect();
        cy = (titleRect.top - containerRect.top) + titleRect.height * 0.45;
      }

      // Radius scaled nicely so it frames the title without getting cut by the submit box
      let maxRadius = 105;
      if (submitBox && this.container) {
        const containerRect = this.container.getBoundingClientRect();
        const submitRect = submitBox.getBoundingClientRect();
        const availableHeight = (submitRect.top - containerRect.top) - cy;
        if (availableHeight > 30) {
          maxRadius = Math.min(maxRadius, availableHeight - 4);
        }
      }

      const radius = Math.min(this.width * 0.30, Math.max(70, maxRadius));
      return { cx, cy, radius };
    }

    /**
     * 3D Spherical Orthographic Projection
     */
    geoTo3D(lat, lng, radiusOffset = 0) {
      const { cx, cy, radius: baseRadius } = this.get3DGlobeMetrics();
      const radius = baseRadius + radiusOffset;

      const radLat = (lat * Math.PI) / 180;
      const radLng = ((lng + this.globeAngle) * Math.PI) / 180;

      // 3D Cartesian coordinates
      const x3d = radius * Math.cos(radLat) * Math.sin(radLng);
      const y3d = -radius * Math.sin(radLat);
      const z3d = radius * Math.cos(radLat) * Math.cos(radLng);

      // Apply axial tilt
      const yTilted = y3d * Math.cos(this.globeTilt) - z3d * Math.sin(this.globeTilt);
      const zTilted = y3d * Math.sin(this.globeTilt) + z3d * Math.cos(this.globeTilt);

      return {
        x: cx + x3d,
        y: cy + yTilted,
        z: zTilted,
        visible: zTilted > -radius * 0.15, // Visible on front / slightly translucent edge
        isFront: zTilted > 0
      };
    }

    geoToCanvas(lat, lng, radiusOffset = 0) {
      if (this.isMobileLayout()) {
        return this.geoTo3D(lat, lng, radiusOffset);
      }
      return this.geoTo2D(lat, lng);
    }

    isMobileLayout() {
      return this.width < 768;
    }

    resize() {
      if (!this.container || !this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      this.width = rect.width;
      const isMobile = this.isMobileLayout();
      this.height = Math.max(isMobile ? 320 : 380, rect.height || 400);

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;

      this.ctx.scale(this.dpr, this.dpr);
      this.updateArcs();
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.resize(), 80);
      });

      // Mouse Move
      this.container.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        this.checkHover();
      });

      this.container.addEventListener('mouseleave', () => {
        this.mousePos = { x: -1000, y: -1000 };
        this.hoveredLocation = null;
        this.hideTooltip();
      });

      // Mobile Touch Drag Physics (Spin 3D Globe with Finger)
      this.container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          const touch = e.touches[0];
          this.lastTouchX = touch.clientX;
          this.isDragging = true;
          this.dragVelocity = 0;

          this.mousePos = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
          };
          this.checkHover(38);
          if (this.hoveredLocation) {
            if (this.touchDismissTimer) clearTimeout(this.touchDismissTimer);
            this.touchDismissTimer = setTimeout(() => this.hideTooltip(), 3200);
          }
        }
      }, { passive: true });

      this.container.addEventListener('touchmove', (e) => {
        if (this.isDragging && e.touches && e.touches.length > 0) {
          const currentX = e.touches[0].clientX;
          const deltaX = currentX - this.lastTouchX;
          this.dragVelocity = deltaX * 0.45;
          this.globeAngle += this.dragVelocity;
          this.lastTouchX = currentX;
        }
      }, { passive: true });

      this.container.addEventListener('touchend', () => {
        this.isDragging = false;
      }, { passive: true });

      // Observe dark / light mode changes
      const observer = new MutationObserver(() => {
        this.theme = document.documentElement.getAttribute('data-theme') || 'dark';
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    async initClientLocationPing() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch('/api/visitor-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timezone: tz })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.locations) {
            this.setLocations(data.locations);
          }
        }
      } catch (e) {}
    }

    setLocations(locs) {
      if (!Array.isArray(locs) || locs.length === 0) return;
      this.locations = locs.map((loc, idx) => ({
        ...loc,
        phase: (idx * 0.35) % 1
      }));
      this.updateArcs();
    }

    updateArcs() {
      if (this.locations.length < 2) {
        this.arcs = [];
        return;
      }
      this.arcs = [];
      const primary = this.locations[0];
      for (let i = 1; i < Math.min(this.locations.length, 5); i++) {
        this.arcs.push({
          source: primary,
          target: this.locations[i],
          progress: (i * 0.22) % 1
        });
      }
    }

    checkHover(customRadius) {
      let nearest = null;
      let minDistance = customRadius || 24;

      for (const loc of this.locations) {
        const pt = this.geoToCanvas(loc.lat, loc.lng);
        if (!pt.visible) continue;
        const dist = Math.hypot(this.mousePos.x - pt.x, this.mousePos.y - pt.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = { loc, screenX: pt.x, screenY: pt.y };
        }
      }

      if (nearest) {
        this.hoveredLocation = nearest.loc;
        this.showTooltip(nearest.loc, nearest.screenX, nearest.screenY);
      } else {
        this.hoveredLocation = null;
        this.hideTooltip();
      }
    }

    showTooltip(loc, x, y) {
      if (!this.tooltip) return;
      const country = loc.country || 'Global';
      const city = loc.city ? `${loc.city}, ` : '';
      const flagCode = (loc.countryCode || 'UN').toUpperCase();

      this.tooltip.innerHTML = `
        <div class="map-tooltip-content">
          <div class="map-tooltip-header">
            <span class="map-tooltip-pulse"></span>
            <span class="map-tooltip-status">Live Visitor</span>
          </div>
          <div class="map-tooltip-loc">
            <span class="map-tooltip-flag">${this.getFlagEmoji(flagCode)}</span>
            <strong>${city}${country}</strong>
          </div>
        </div>
      `;
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y - 12}px`;
      this.tooltip.classList.add('visible');
    }

    hideTooltip() {
      if (this.tooltip) {
        this.tooltip.classList.remove('visible');
      }
    }

    getFlagEmoji(countryCode) {
      if (!countryCode || countryCode === 'UN' || countryCode.length !== 2) return '🌍';
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    }

    startAnimationLoop() {
      const render = (time) => {
        const now = performance.now();
        const dt = (now - this.lastFrameTime) * 0.001;
        this.lastFrameTime = now;

        // Auto-rotation in 3D Mode + Momentum Damping
        if (this.isMobileLayout()) {
          if (!this.isDragging) {
            this.dragVelocity *= 0.94; // Friction
            this.globeAngle += (0.45 + this.dragVelocity); // Constant rotation speed
          }
        }

        this.draw(time);
        this.animFrameId = requestAnimationFrame(render);
      };
      this.animFrameId = requestAnimationFrame(render);
    }

    draw(time) {
      const ctx = this.ctx;
      if (!ctx || this.width === 0) return;

      const isDark = this.theme === 'dark';
      const isMobile = this.isMobileLayout();
      const t = time * 0.0012;

      ctx.clearRect(0, 0, this.width, this.height);

      if (isMobile) {
        this.draw3DGlobe(ctx, isDark, t);
      } else {
        this.draw2DPanoramic(ctx, isDark, t);
      }
    }

    /**
     * Render Minimalist Clean 3D Rotating Globe (No heavy glows or backdrop discs)
     */
    draw3DGlobe(ctx, isDark, t) {
      const { cx, cy, radius } = this.get3DGlobeMetrics();

      // 1. Clean 3D Rotating Continents Dot Matrix
      const defaultDotColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.22)';
      const activeDotColor = isDark ? '#10b981' : '#059669';

      for (let i = 0; i < this.landDots.length; i++) {
        const dot = this.landDots[i];
        const pt = this.geoTo3D(dot.lat, dot.lng);

        // Only draw visible front-facing dots
        if (pt.isFront) {
          let isNearNode = false;
          for (const loc of this.locations) {
            const locPt = this.geoTo3D(loc.lat, loc.lng);
            if (locPt.isFront && Math.hypot(pt.x - locPt.x, pt.y - locPt.y) < 18) {
              isNearNode = true;
              break;
            }
          }

          ctx.fillStyle = isNearNode ? activeDotColor : defaultDotColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isNearNode ? 1.5 : 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Clean 3D Connecting Arcs
      for (const arc of this.arcs) {
        const p1 = this.geoTo3D(arc.source.lat, arc.source.lng, 2);
        const p2 = this.geoTo3D(arc.target.lat, arc.target.lng, 2);

        if (!p1.isFront || !p2.isFront) continue;

        const midX = (p1.x + p2.x) / 2;
        const midY = Math.min(p1.y, p2.y) - Math.abs(p1.x - p2.x) * 0.15;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(5, 150, 105, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        arc.progress = (arc.progress + 0.007) % 1;
        const prog = arc.progress;
        const dotX = (1 - prog) * (1 - prog) * p1.x + 2 * (1 - prog) * prog * midX + prog * prog * p2.x;
        const dotY = (1 - prog) * (1 - prog) * p1.y + 2 * (1 - prog) * prog * midY + prog * prog * p2.y;

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.fill();
      }

      // 3. Clean Visitor Beacons
      for (let i = 0; i < this.locations.length; i++) {
        const loc = this.locations[i];
        const pt = this.geoTo3D(loc.lat, loc.lng);
        if (!pt.isFront) continue;

        const phase = (t + (loc.phase || 0)) % 1;

        // Subtle radar ripple ring
        const r = 3 + phase * 14;
        const alpha = (1 - phase) * 0.7;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? `rgba(16, 185, 129, ${alpha})` : `rgba(5, 150, 105, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Pin Core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#10b981' : '#059669';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    /**
     * Render Desktop 2D Panoramic Map
     */
    draw2DPanoramic(ctx, isDark, t) {
      // 1. Graticule Grid Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
      ctx.setLineDash([3, 6]);

      [-45, -20, 0, 20, 45, 65].forEach(lat => {
        const p1 = this.geoTo2D(lat, -180);
        const p2 = this.geoTo2D(lat, 180);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      [-120, -60, 0, 60, 120].forEach(lng => {
        const p1 = this.geoTo2D(75, lng);
        const p2 = this.geoTo2D(-60, lng);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      ctx.setLineDash([]);

      // 2. Continent Vector Silhouettes
      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.035)' : 'rgba(5, 150, 105, 0.04)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.07)';
      ctx.lineWidth = 1;

      for (const poly of CONTINENT_POLYGONS) {
        ctx.beginPath();
        const start = this.geoTo2D(poly[0][1], poly[0][0]);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < poly.length; i++) {
          const pt = this.geoTo2D(poly[i][1], poly[i][0]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 3. Dense Land Matrix Dots
      const defaultDotColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.22)';
      const activeDotColor = isDark ? 'rgba(16, 185, 129, 0.65)' : 'rgba(5, 150, 105, 0.7)';

      for (let i = 0; i < this.landDots.length; i++) {
        const dot = this.landDots[i];
        const pt = this.geoTo2D(dot.lat, dot.lng);

        let isNearNode = false;
        for (const loc of this.locations) {
          const locPt = this.geoTo2D(loc.lat, loc.lng);
          if (Math.hypot(pt.x - locPt.x, pt.y - locPt.y) < 36) {
            isNearNode = true;
            break;
          }
        }

        ctx.fillStyle = isNearNode ? activeDotColor : defaultDotColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isNearNode ? 1.6 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Flight Arcs
      for (const arc of this.arcs) {
        const p1 = this.geoTo2D(arc.source.lat, arc.source.lng);
        const p2 = this.geoTo2D(arc.target.lat, arc.target.lng);

        const midX = (p1.x + p2.x) / 2;
        const midY = Math.min(p1.y, p2.y) - Math.abs(p1.x - p2.x) * 0.16;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(5, 150, 105, 0.25)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        arc.progress = (arc.progress + 0.005) % 1;
        const prog = arc.progress;
        const dotX = (1 - prog) * (1 - prog) * p1.x + 2 * (1 - prog) * prog * midX + prog * prog * p2.x;
        const dotY = (1 - prog) * (1 - prog) * p1.y + 2 * (1 - prog) * prog * midY + prog * prog * p2.y;

        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.shadowColor = isDark ? '#10b981' : '#059669';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Visitor Beacons & Floating Badges
      for (let i = 0; i < this.locations.length; i++) {
        const loc = this.locations[i];
        const pt = this.geoTo2D(loc.lat, loc.lng);
        const phase = (t + (loc.phase || 0)) % 1;

        for (let ring = 0; ring < 2; ring++) {
          const rProg = (phase + ring * 0.5) % 1;
          const radius = 5 + rProg * 30;
          const alpha = (1 - rProg) * (isDark ? 0.75 : 0.65);

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? `rgba(16, 185, 129, ${alpha})` : `rgba(5, 150, 105, ${alpha})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(5, 150, 105, 0.35)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#10b981' : '#059669';
        ctx.shadowColor = isDark ? '#10b981' : '#059669';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (loc.city && this.width > 600) {
          const cityName = loc.city.replace('San Francisco', 'SF').replace('United States', 'USA');
          const badgeText = `${cityName}`;
          ctx.font = '600 10.5px "Plus Jakarta Sans", sans-serif';
          const textMetrics = ctx.measureText(badgeText);
          const badgeW = textMetrics.width + 16;
          const badgeH = 18;
          const badgeX = pt.x + 10;
          const badgeY = pt.y - 10;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.35)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY - 12, badgeW, badgeH, 999);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isDark ? '#10b981' : '#059669';
          ctx.beginPath();
          ctx.arc(badgeX + 6, badgeY - 3, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
          ctx.fillText(badgeText, badgeX + 12, badgeY);
        }
      }

      // 6. Radial Fade Mask
      const edgeGrad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.width * 0.28,
        this.width / 2, this.height / 2, this.width * 0.52
      );
      edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      edgeGrad.addColorStop(1, isDark ? 'rgba(10, 10, 10, 0.35)' : 'rgba(255, 255, 255, 0.35)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.paylinkWorldMap = new WorldMapHero();
  });
})();

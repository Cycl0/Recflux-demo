"use client";

import { useEffect, useRef, useMemo } from 'react';

export default function CTAButton(props) {
  const {
    text = 'Click me',
    href = '#action',
    className = '',
    glowingColor = undefined,
  } = props;

  function hexToRgbA(hex, opacity) {
    var c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return (
        'rgba(' +
        [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') +
        `,${opacity})`
      );
    }
    throw new Error('Bad Hex');
  }
  
  // --- Color helpers to derive gradients from a base glow color ---
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function hexToRgb(hex) {
    // Coerce invalid values to a safe fallback
    const fallback = '#000000';
    if (typeof hex !== 'string') hex = fallback;
    hex = hex.trim();
    if (!hex) hex = fallback;
    if (hex[0] !== '#') hex = `#${hex}`;
    let c = hex.replace('#','');
    if (!/^([A-Fa-f0-9]{3}){1,2}$/.test(c)) c = '000000';
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHex(r, g, b) {
    const toHex = v => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function withAlphaHex(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${clamp01(alpha)})`;
  }
  
  // RGB <-> HSL conversions for perceptual adjustments
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }
  
  // Calculate relative luminance for contrast calculations
  function getLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  // Calculate contrast ratio between two colors
  function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }
  
  // Generate optimal text color based on glow color and button background
  function getOptimalTextColor(glowHex, buttonBg = '#d1d1d1') {
    const isDefaultColor = glowHex.toLowerCase() === '#ff0000';
    
    if (isDefaultColor) {
      // Use exact original text color for default
      return '#5A250A';
    }
    
    // For custom colors, derive a darker version of the glow color
    const { h, s, l } = hexToHsl(glowHex);
    
    // Create a dark version of the glow color
    const darkGlow = hslToHex(h, clamp01(s * 0.8), clamp01(l * 0.25));
    
    // Also try a very dark neutral brown (similar to original)
    const darkBrown = '#3A1F0A';
    
    // Test contrast ratios against button background
    const darkGlowContrast = getContrastRatio(darkGlow, buttonBg);
    const darkBrownContrast = getContrastRatio(darkBrown, buttonBg);
    
    // Choose the color with better contrast (minimum 3:1 for readability)
    if (darkGlowContrast >= 3.0 && darkGlowContrast > darkBrownContrast) {
      return darkGlow;
    } else if (darkBrownContrast >= 3.0) {
      return darkBrown;
    } else {
      // Fallback to black if neither provides good contrast
      return '#000000';
    }
  }
  function lerpHue(a, b, t) {
    // a,b in [0,1). Interpolate with smart path selection
    let shortPath = b - a;
    if (shortPath > 0.5) shortPath -= 1;
    else if (shortPath < -0.5) shortPath += 1;
    
    let longPath = shortPath > 0 ? shortPath - 1 : shortPath + 1;
    
    // For large hue differences, prefer the path that goes toward the target color family
    // This prevents blue from becoming magenta, green from becoming yellow, etc.
    let chosenPath = shortPath;
    
    // If the short path is very large (>120°), consider the long path
    if (Math.abs(shortPath) > 0.33) {
      // Check if we're going from warm colors (orange/red) to cool colors (blue/cyan)
      // or vice versa - in these cases, the long path often gives more intuitive results
      const isWarmToBlue = (a < 0.1 || a > 0.9) && (b > 0.5 && b < 0.75); // red/orange to blue/cyan
      const isBlueToWarm = (a > 0.5 && a < 0.75) && (b < 0.1 || b > 0.9); // blue/cyan to red/orange
      
      if (isWarmToBlue || isBlueToWarm) {
        chosenPath = longPath;
      }
    }
    
    let h = a + chosenPath * clamp01(t);
    if (h < 0) h += 1;
    if (h >= 1) h -= 1;
    return h;
  }
  
  // Alternative approach: blend in RGB space for more predictable color mixing
  function blendRGB(baseHex, targetHex, influence) {
    const base = hexToRgb(baseHex);
    const target = hexToRgb(targetHex);
    const t = clamp01(influence);
    
    const r = Math.round(base.r + (target.r - base.r) * t);
    const g = Math.round(base.g + (target.g - base.g) * t);
    const b = Math.round(base.b + (target.b - base.b) * t);
    
    return rgbToHex(r, g, b);
  }
  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }
  function tintTowards(baseHex, glowHex, hueInfluence, satInfluence, lightInfluence) {
    const b = hexToHsl(baseHex);
    const g = hexToHsl(glowHex);
    
    // Calculate hue difference
    let hueDiff = Math.abs(b.h - g.h);
    if (hueDiff > 0.5) hueDiff = 1 - hueDiff;
    
    // For strong hue influence (>0.3), use more direct hue targeting
    // This ensures the colors actually match the glow color
    if (clamp01(hueInfluence) > 0.3) {
      // Use much more of the target hue for strong influences
      const targetHue = g.h;
      const blendedSat = clamp01(b.s * (1 - clamp01(satInfluence)) + g.s * clamp01(satInfluence));
      const blendedLight = clamp01(b.l * (1 - clamp01(lightInfluence)) + g.l * clamp01(lightInfluence));
      
      // Use a much stronger interpolation - boost the influence significantly
      const boostedInfluence = Math.min(1.0, clamp01(hueInfluence) * 2.0);
      const h = lerpHue(b.h, targetHue, boostedInfluence);
      
      return hslToHex(h, blendedSat, blendedLight);
    } else {
      // For weak influence, use normal HSL blending
      const h = lerpHue(b.h, g.h, clamp01(hueInfluence));
      const s = clamp01(b.s * (1 - clamp01(satInfluence)) + g.s * clamp01(satInfluence));
      const l = clamp01(b.l * (1 - clamp01(lightInfluence)) + g.l * clamp01(lightInfluence));
      return hslToHex(h, s, l);
    }
  }
  function tintTowardsRGBA(baseHex, glowHex, hueInfluence, satInfluence, lightInfluence, alpha) {
    const hex = tintTowards(baseHex, glowHex, hueInfluence, satInfluence, lightInfluence);
    return withAlphaHex(hex, alpha);
  }


  const glowHex = (typeof glowingColor === 'string' && glowingColor.trim()) ? (glowingColor[0] === '#' ? glowingColor : `#${glowingColor}`) : '#FF0000';
  const textColor = getOptimalTextColor(glowHex);

  // Derive orb gradients from glowingColor
  const gradients = useMemo(() => {
    const isDefaultColor = glowHex.toLowerCase() === '#ff0000';
    
    if (isDefaultColor) {
      // Use exact original gradients when default color
      return {
        orb121Gradient: 'radial-gradient(50% 50% at 50% 50%, #FFFFF5 3.5%, #FFAA81 26.5%, #FFDA9F 37.5%, rgba(255,170,129,0.50) 49%, rgba(210,106,58,0.00) 92.5%)',
        orb204Gradient: 'radial-gradient(43.3% 44.23% at 50% 49.51%, #FFFFF7 29%, #FFFACD 48.5%, #F4D2BF 60.71%, rgba(214,211,210,0.00) 100%)',
        
        // Exact border gradients from original CSS
        borderBlurOuter: 'linear-gradient(91.88deg, rgba(255,137,100,.2) 46.45%, #cd3100 98.59%)',
        borderBlurInner: 'linear-gradient(97.68deg, rgba(255,177,153,0) 38.1%, rgba(255,177,153,.2) 82.47%, #ff7950 93.3%)',
        borderLight: 'linear-gradient(103.7deg, hsla(15,25%,65%,.1) 38.66%, rgba(233,132,99,.1) 68.55%, #e98463 85.01%, #fff 92.12%)',
        borderLightBefore: 'linear-gradient(91.96deg, rgba(255,177,153,0) 6.11%, rgba(255,177,153,.2) 53.57%, #ff7950 93.6%)',
      };
    } else {
      // Create vibrant adapted gradients by shifting towards glow color while preserving luminance
      const { h: glowH, s: glowS, l: glowL } = hexToHsl(glowHex);
      
                    // Create color variants using the improved tintTowards function to avoid unwanted green tints
              const A = tintTowards('#FFFFF5', glowHex, 0.15, 0.1, 0.0);
              const B = tintTowards('#FFAA81', glowHex, 0.6, 0.4, 0.0);
              const C = tintTowards('#FFDA9F', glowHex, 0.5, 0.3, 0.0);
              const D50 = withAlphaHex(tintTowards('#FFAA81', glowHex, 0.6, 0.4, 0.0), 0.50);
              const E0 = withAlphaHex(tintTowards('#D26A3A', glowHex, 0.7, 0.4, 0.0), 0.00);

              const A2 = tintTowards('#FFFFF7', glowHex, 0.1, 0.08, 0.0);
              const B2 = tintTowards('#FFFACD', glowHex, 0.3, 0.2, 0.0);
              const C2 = tintTowards('#F4D2BF', glowHex, 0.4, 0.3, 0.0);
              const D2 = withAlphaHex('#D6D3D2', 0.00);

              // Border colors using improved tinting
              const borderPrimary = tintTowards('#ff7950', glowHex, 0.4, 0.2, 0.0);
              const borderSecondary = tintTowards('#cd3100', glowHex, 0.4, 0.2, 0.0);
              const borderTertiary = tintTowards('#e98463', glowHex, 0.3, 0.1, 0.0);

      return {
        orb121Gradient: `radial-gradient(50% 50% at 50% 50%, ${A} 3.5%, ${B} 26.5%, ${C} 37.5%, ${D50} 49%, ${E0} 92.5%)`,
        orb204Gradient: `radial-gradient(43.3% 44.23% at 50% 49.51%, ${A2} 29%, ${B2} 48.5%, ${C2} 60.71%, ${D2} 100%)`,
        
        borderBlurOuter: `linear-gradient(91.88deg, ${withAlphaHex(B, 0.2)} 46.45%, ${borderSecondary} 98.59%)`,
        borderBlurInner: `linear-gradient(97.68deg, ${withAlphaHex(B, 0)} 38.1%, ${withAlphaHex(B, 0.2)} 82.47%, ${borderPrimary} 93.3%)`,
        borderLight: `linear-gradient(103.7deg, hsla(15,25%,65%,.1) 38.66%, rgba(233,132,99,.1) 68.55%, ${withAlphaHex(borderTertiary, 1)} 85.01%, #fff 92.12%)`,
        borderLightBefore: `linear-gradient(91.96deg, ${withAlphaHex(B, 0)} 6.11%, ${withAlphaHex(B, 0.2)} 53.57%, ${borderPrimary} 93.6%)`,
      };
    }
  }, [glowHex]);

  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const orbRef = useRef(null);
  const blurPrimaryRef = useRef(null); // right-side glow
  const blurMirroredRef = useRef(null); // left-side glow (mirrored)

  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const minXRef = useRef(0);
  const maxXRef = useRef(0);
  const rafRef = useRef(null);
  const visiblePx = 120;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const button = buttonRef.current;
    const orb = orbRef.current;
    const blurPrimary = blurPrimaryRef.current;
    const blurMirrored = blurMirroredRef.current;
    if (!wrapper || !button || !orb || !blurPrimary || !blurMirrored) return;

    const updateOpacity = () => {
      const minX = minXRef.current;
      const maxX = maxXRef.current;
      const range = maxX - minX;
      if (range <= 0) return;

      let t = (currentRef.current - minX) / range; // 0..1 (left..right)
      t = Math.max(0, Math.min(1, t));

      const rightOpacity = t > 0.5 ? (t - 0.5) / 0.5 : 0; // mid→right: 0→1
      const leftOpacity = t < 0.5 ? (0.5 - t) / 0.5 : 0; // mid→left: 0→1

      blurPrimary.style.opacity = rightOpacity.toFixed(3);
      blurMirrored.style.opacity = leftOpacity.toFixed(3);
    };

    const animate = () => {
      const k = 0.18;
      currentRef.current += (targetRef.current - currentRef.current) * k;
      orb.style.transform = `translateX(${currentRef.current.toFixed(
        3
      )}px) translateZ(0)`;
      updateOpacity();
      rafRef.current = requestAnimationFrame(animate);
    };

    const computeBounds = () => {
      const rect = button.getBoundingClientRect();
      const orbWidth = orb.offsetWidth || 204;
      minXRef.current = -orbWidth + visiblePx; // show visiblePx at left
      maxXRef.current = rect.width - visiblePx; // show visiblePx at right
      currentRef.current = maxXRef.current;
      targetRef.current = maxXRef.current;
      orb.style.transform = `translateX(${currentRef.current.toFixed(
        3
      )}px) translateZ(0)`;
      updateOpacity();
      if (!rafRef.current) animate();
    };

    const onMove = e => {
      const rect = button.getBoundingClientRect();
      const orbWidth = orb.offsetWidth || 204;
      const cursorX = (e.clientX ?? 0) - rect.left;
      let x = cursorX - orbWidth / 2;
      x = Math.max(minXRef.current, Math.min(maxXRef.current, x));
      targetRef.current = x;
      if (!rafRef.current) animate();
    };

    const onEnter = () => {
      if (!rafRef.current) animate();
    };

    const onLeave = () => {
      const distLeft = Math.abs(currentRef.current - minXRef.current);
      const distRight = Math.abs(maxXRef.current - currentRef.current);
      targetRef.current =
        distLeft < distRight ? minXRef.current : maxXRef.current;
      const stop = () => {
        if (
          Math.abs(targetRef.current - currentRef.current) < 0.5 &&
          rafRef.current
        ) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        } else {
          setTimeout(stop, 80);
        }
      };
      setTimeout(stop, 120);
    };

    computeBounds();
    window.addEventListener('resize', computeBounds);
    const el = wrapper;
    [
      'mousemove',
      'mouseenter',
      'mouseleave',
      'pointermove',
      'pointerenter',
      'pointerleave',
    ].forEach(ev => {
      el.addEventListener(
        ev,
        ev.includes('move') ? onMove : ev.includes('enter') ? onEnter : onLeave
      );
    });

    return () => {
      window.removeEventListener('resize', computeBounds);
      [
        'mousemove',
        'mouseenter',
        'mouseleave',
        'pointermove',
        'pointerenter',
        'pointerleave',
      ].forEach(ev => {
        el.removeEventListener(
          ev,
          ev.includes('move')
            ? onMove
            : ev.includes('enter')
            ? onEnter
            : onLeave
        );
      });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div className={`flex justify-center ${className}`}>
      <div ref={wrapperRef} className='relative inline-flex items-center z-10'>
        {/* Right blur layer (simulates gradient border + glow) */}
        <div
          ref={blurPrimaryRef}
          className='absolute left-1/2 top-1/2 h-[calc(100%+9px)] w-[calc(100%+9px)] -translate-x-1/2 -translate-y-1/2 rounded-full will-change-transform'
          style={{ opacity: 1 }}
        >
                     {/* outer glow */}
           <div
             className='absolute -left-[3px] -top-[3px] z-20 h-[calc(100%+6px)] w-[calc(100%+6px)] rounded-full border-[3px] border-transparent blur-[15px] [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderBlurOuter} border-box`,
             }}
           />
           {/* crisp inner gradient border */}
           <div
             className='absolute inset-0 z-10 rounded-full border-[2px] border-transparent blur-[2px] [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderBlurInner} border-box`,
             }}
           />
           <div
             className='relative h-full w-full rounded-full border-[1px] border-transparent [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderLight} border-box`,
             }}
           />
        </div>

        {/* Left blur layer (mirrored) */}
        <div
          ref={blurMirroredRef}
          className='absolute left-1/2 top-1/2 h-[calc(100%+9px)] w-[calc(100%+9px)] -translate-x-1/2 -translate-y-1/2 scale-x-[-1] transform rounded-full will-change-transform'
          style={{ opacity: 0 }}
        >
                     <div
             className='absolute -left-[3px] -top-[3px] z-20 h-[calc(100%+6px)] w-[calc(100%+6px)] rounded-full border-[3px] border-transparent blur-[15px] [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderBlurOuter} border-box`,
             }}
           />
           <div
             className='absolute inset-0 z-10 rounded-full border-[2px] border-transparent blur-[2px] [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderBlurInner} border-box`,
             }}
           />
           <div
             className='relative h-full w-full rounded-full border-[1px] border-transparent [background-clip:padding-box,border-box]'
             style={{
               background:
                 `linear-gradient(transparent,transparent) padding-box, ${gradients.borderLight} border-box`,
             }}
           />
        </div>

        {/* Button */}
        <a
          ref={buttonRef}
          href={href}
          className='cta-button transition-colors duration-200 transition-all duration-200 uppercase font-bold flex items-center justify-center h-10 px-16 text-12 text-black -tracking-[0.015em] relative z-10 overflow-hidden rounded-full border border-white/60 bg-[#d1d1d1] space-x-1 sm:pl-[59px] sm:pr-[52px] hover:bg-[#e1e1e1]'
        >
          {/* Orb (moves horizontally) */}
          <div
            ref={orbRef}
            className='absolute -z-10 flex w-[204px] items-center justify-center'
            style={{ transform: 'translateX(114.203px) translateZ(0)' }}
          >
            <div
              className='absolute top-1/2 h-[121px] w-[121px] -translate-y-1/2'
              style={{
                background: gradients.orb121Gradient,
              }}
            />
            <div
              className='absolute top-1/2 h-[103px] w-[204px] -translate-y-1/2 blur-[5px]'
              style={{
                background: gradients.orb204Gradient,
              }}
            />
          </div>

          <span style={{ color: textColor }}>{text}</span>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-[9px] w-[17px]'
            style={{ color: textColor }}
            viewBox='0 0 17 9'
            fill='none'
          >
            <path
              fill='currentColor'
              fillRule='evenodd'
              clipRule='evenodd'
              d='m12.495 0 4.495 4.495-4.495 4.495-.99-.99 2.805-2.805H0v-1.4h14.31L11.505.99z'
            />
          </svg>
        </a>
      </div>
    </div>
  );
}

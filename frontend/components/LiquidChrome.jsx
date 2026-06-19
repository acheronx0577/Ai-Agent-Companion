import { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

const RENDER_SCALE = 0.72;

const LiquidChrome = ({
  baseColor = [0.1, 0.1, 0.1],
  speed = 0.2,
  amplitude = 0.3,
  frequencyX = 3,
  frequencyY = 3,
  interactive = true,
  ...props
}) => {
  const containerRef = useRef(null);
  const mouseClientRef = useRef({ x: -1, y: -1 });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const renderer = new Renderer({ antialias: false, alpha: false });
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    let isVisible = true;

    const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      uniform float uInteractive;
      varying vec2 vUv;

      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);
          float mouseInfluence = uInteractive;

          for (float i = 1.0; i < 10.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159 * mouseInfluence);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159 * mouseInfluence);
          }

          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03 * mouseInfluence;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;

          vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
          return vec4(color, 1.0);
      }

      void main() {
          gl_FragColor = renderImage(vUv);
      }
    `;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]),
        },
        uBaseColor: { value: new Float32Array(baseColor) },
        uAmplitude: { value: amplitude },
        uFrequencyX: { value: frequencyX },
        uFrequencyY: { value: frequencyY },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uInteractive: { value: interactive ? 1 : 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    function updateMouseFromClient() {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const x = (mouseClientRef.current.x - rect.left) / rect.width;
      const y = 1 - (mouseClientRef.current.y - rect.top) / rect.height;
      const mouseUniform = program.uniforms.uMouse.value;
      mouseUniform[0] = Math.min(Math.max(x, 0), 1);
      mouseUniform[1] = Math.min(Math.max(y, 0), 1);
    }

    function resize() {
      const host = container.parentElement ?? container;
      const displayWidth = Math.max(1, host.offsetWidth || container.offsetWidth);
      const displayHeight = Math.max(1, host.offsetHeight || container.offsetHeight);
      const width = Math.max(1, Math.floor(displayWidth * RENDER_SCALE));
      const height = Math.max(1, Math.floor(displayHeight * RENDER_SCALE));
      renderer.setSize(width, height);
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";
      gl.canvas.style.display = "block";
      const resUniform = program.uniforms.uResolution.value;
      resUniform[0] = gl.canvas.width;
      resUniform[1] = gl.canvas.height;
      resUniform[2] = gl.canvas.width / gl.canvas.height;
      if (interactive) {
        updateMouseFromClient();
      }
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
      },
      { rootMargin: "120px 0px" },
    );
    visibilityObserver.observe(container.parentElement ?? container);

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container.parentElement ?? container);

    function handleAtmosphereResize() {
      resize();
    }

    function handleMouseMove(event) {
      mouseClientRef.current.x = event.clientX;
      mouseClientRef.current.y = event.clientY;
      updateMouseFromClient();
    }

    function handleTouchMove(event) {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        mouseClientRef.current.x = touch.clientX;
        mouseClientRef.current.y = touch.clientY;
        updateMouseFromClient();
      }
    }

    window.addEventListener("resize", resize);
    window.addEventListener("waku-hero-atmosphere-resize", handleAtmosphereResize);

    if (interactive) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
    }

    resize();

    let animationId;
    function update(time) {
      animationId = requestAnimationFrame(update);
      if (!isVisible) {
        return;
      }
      if (interactive) {
        updateMouseFromClient();
      }
      program.uniforms.uTime.value = time * 0.001 * speed;
      renderer.render({ scene: mesh });
    }
    animationId = requestAnimationFrame(update);

    container.appendChild(gl.canvas);

    return () => {
      cancelAnimationFrame(animationId);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("waku-hero-atmosphere-resize", handleAtmosphereResize);
      if (interactive) {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchmove", handleTouchMove);
      }
      if (gl.canvas.parentElement) {
        gl.canvas.parentElement.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive]);

  return <div ref={containerRef} className="liquid-chrome-container" {...props} />;
};

export default LiquidChrome;

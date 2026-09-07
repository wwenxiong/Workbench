import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  angle: number;
  baseAngle: number;
  targetAngle: number;
  color: string;
  alpha: number;
  phase: number;
  speed: number;
}

const COLORS = {
  coral: ['#EA4335', '#FF5757', '#FA5252', '#F03E3E', '#E64980'],
  amber: ['#FBBC05', '#FCC419', '#FAB005', '#F59F00', '#FFA94D'],
  blue: ['#4285F4', '#339AF0', '#228BE6', '#1C7ED6', '#4DABF7'],
  purple: ['#7950F2', '#845EC2', '#9775FA', '#BE4BDB', '#845EC2'],
  teal: ['#34A853', '#20C997', '#12B886', '#51CF66'],
};

export const AntigravityParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse with smooth spring follower
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      vx: 0,
      vy: 0,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      initParticles();
    };

    // Color distribution based on screen quadrant like Antigravity site
    const pickColor = (x: number, y: number): string => {
      const relX = x / width;
      const relY = y / height;
      const rand = Math.random();

      // Top-right -> Amber/Yellow dominant
      if (relX > 0.55 && relY < 0.55 && rand < 0.65) {
        const list = COLORS.amber;
        return list[Math.floor(Math.random() * list.length)];
      }
      // Bottom-right / Right -> Blue/Purple dominant
      if (relX > 0.5 && rand < 0.65) {
        const list = rand < 0.5 ? COLORS.blue : COLORS.purple;
        return list[Math.floor(Math.random() * list.length)];
      }
      // Left / Center -> Coral / Red dominant
      if (relX <= 0.55 && rand < 0.7) {
        const list = COLORS.coral;
        return list[Math.floor(Math.random() * list.length)];
      }
      // Occasional Teal or Purple
      const list = rand < 0.5 ? COLORS.teal : COLORS.purple;
      return list[Math.floor(Math.random() * list.length)];
    };

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      // Calculate particle count based on viewport area (density balance)
      const count = Math.min(Math.max(Math.floor((width * height) / 6000), 160), 280);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const length = 5 + Math.random() * 6; // 5px ~ 11px capsule length
        const pWidth = 2.2 + Math.random() * 1.4; // 2.2px ~ 3.6px thickness
        const baseAngle = (Math.random() - 0.5) * Math.PI * 0.8;

        particles.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          length,
          width: pWidth,
          angle: baseAngle,
          baseAngle,
          targetAngle: baseAngle,
          color: pickColor(x, y),
          alpha: 0.45 + Math.random() * 0.4, // 0.45 ~ 0.85
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.8,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      time += 0.02;

      // Smooth mouse interpolation
      if (mouse.active) {
        const dx = mouse.targetX - mouse.x;
        const dy = mouse.targetY - mouse.y;
        mouse.vx = dx * 0.15;
        mouse.vy = dy * 0.15;
        mouse.x += mouse.vx;
        mouse.y += mouse.vy;
      } else {
        mouse.x += (-1000 - mouse.x) * 0.1;
        mouse.y += (-1000 - mouse.y) * 0.1;
        mouse.vx *= 0.8;
        mouse.vy *= 0.8;
      }

      ctx.clearRect(0, 0, width, height);

      const influenceRadius = 240;
      const influenceRadiusSq = influenceRadius * influenceRadius;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Idle organic floating motion
        const floatX = Math.cos(time * p.speed + p.phase) * 0.4;
        const floatY = Math.sin(time * p.speed + p.phase) * 0.4;

        // Interaction with mouse cursor
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (mouse.active && distSq < influenceRadiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const normX = dx / dist;
          const normY = dy / dist;
          const factor = 1 - dist / influenceRadius; // 1 at center, 0 at boundary

          // Repulsion force
          const repelForce = factor * factor * 5.0;
          p.vx += normX * repelForce;
          p.vy += normY * repelForce;

          // Tangential swirl (vortex effect characteristic of Antigravity)
          const swirlForce = factor * 2.2;
          p.vx += -normY * swirlForce;
          p.vy += normX * swirlForce;

          // Particle aligns tangentially to the mouse flow field
          p.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
        } else {
          // Gently return to idle float angle
          p.targetAngle = p.baseAngle + Math.sin(time + p.phase) * 0.25;
        }

        // Spring force returning particle back to resting home position
        const homeDx = p.homeX - p.x;
        const homeDy = p.homeY - p.y;
        p.vx += homeDx * 0.035;
        p.vy += homeDy * 0.035;

        // Damping / Friction
        p.vx *= 0.84;
        p.vy *= 0.84;

        p.x += p.vx + floatX;
        p.y += p.vy + floatY;

        // Angle interpolation (smooth turning)
        let diffAngle = p.targetAngle - p.angle;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        p.angle += diffAngle * 0.12;

        // Draw Antigravity rounded dash capsule
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        const halfL = p.length / 2;
        const halfW = p.width / 2;
        const r = halfW;

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(-halfL, -halfW, p.length, p.width, r);
        } else {
          ctx.arc(-halfL + r, 0, r, Math.PI / 2, Math.PI * 1.5);
          ctx.lineTo(halfL - r, -halfW);
          ctx.arc(halfL - r, 0, r, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1] w-full h-full"
      style={{ opacity: 0.92 }}
    />
  );
};

export default AntigravityParticles;

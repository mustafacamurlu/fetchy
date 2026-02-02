import { useEffect, useRef } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  opacity: number;
}

const colors = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match parent container
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Create confetti pieces
    const createConfetti = () => {
      const pieces: ConfettiPiece[] = [];

      // Create confetti pieces raining from top
      for (let i = 0; i < 150; i++) {
        pieces.push({
          x: Math.random() * canvas.width, // Random x position across screen
          y: -Math.random() * canvas.height, // Start above screen with staggered positions
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          size: 3 + Math.random() * 4, // Smaller confetti pieces
          speedX: (Math.random() - 0.5) * 2, // Gentle horizontal drift
          speedY: 2 + Math.random() * 3, // Fall downward
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle',
          opacity: 1,
        });
      }
      return pieces;
    };

    confettiRef.current = createConfetti();

    // Animation loop
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const duration = 3000; // 3 seconds animation

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw confetti
      confettiRef.current.forEach((piece) => {
        // Update position - rain effect
        piece.x += piece.speedX;
        piece.y += piece.speedY;
        piece.rotation += piece.rotationSpeed;

        // Gentle swaying motion
        piece.speedX += (Math.random() - 0.5) * 0.1;
        piece.speedX *= 0.98; // Dampen horizontal movement

        // Recycle confetti that falls off screen (continuous rain effect)
        if (piece.y > canvas.height + 20) {
          piece.y = -20;
          piece.x = Math.random() * canvas.width;
        }

        // Fade out near the end
        if (elapsed > duration - 1000) {
          piece.opacity = Math.max(0, 1 - (elapsed - (duration - 1000)) / 1000);
        }

        // Draw confetti
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.globalAlpha = piece.opacity;

        ctx.fillStyle = piece.color;

        if (piece.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (piece.shape === 'square') {
          ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        } else if (piece.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -piece.size / 2);
          ctx.lineTo(piece.size / 2, piece.size / 2);
          ctx.lineTo(-piece.size / 2, piece.size / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      // Continue animation or stop
      if (elapsed < duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Fade out canvas
        ctx.globalAlpha = 0;
      }
    };

    // Start animation after a brief delay
    setTimeout(() => {
      animate();
    }, 300);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}


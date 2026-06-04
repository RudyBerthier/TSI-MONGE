import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Play, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 20;
const CELL_SIZE = 20; // 400x400 canvas
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2; // ms decrease per apple
const MIN_SPEED = 50;

const SnakeClient = ({ onExit }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [newHigh, setNewHigh] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Game internals
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const directionRef = useRef({ x: 1, y: 0 }); // Moving right
  const nextDirectionRef = useRef({ x: 1, y: 0 }); // Prevent double turn into self
  const foodRef = useRef({ x: 15, y: 10 });
  const gameLoopRef = useRef(null);
  const speedRef = useRef(INITIAL_SPEED);
  const scoreRef = useRef(0); // tracks real score for callbacks (avoids stale closures)
  const highScoreRef = useRef(0);

  useEffect(() => {
    // Load local high score immediately for instant feedback, API handles global later
    const localHigh = localStorage.getItem('snake_local_high');
    if (localHigh) {
      const parsed = parseInt(localHigh, 10);
      setHighScore(parsed);
      highScoreRef.current = parsed;
    }
  }, []);

  const spawnFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      // Make sure food doesn't spawn on snake
      const onSnake = snakeRef.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) break;
    }
    foodRef.current = newFood;
  }, []);

  const submitScore = async (finalScore) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/games/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ game: 'snake', score: finalScore })
      });
      const data = await res.json();
      if (data.isNewHigh) {
        setNewHigh(true);
      }
    } catch (err) {
      console.error('Erreur soumission score Snake:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const gameOver = useCallback(() => {
    setGameState('gameover');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    const finalScore = scoreRef.current;

    if (finalScore > highScoreRef.current) {
      setHighScore(finalScore);
      highScoreRef.current = finalScore;
      localStorage.setItem('snake_local_high', finalScore.toString());
    }

    if (finalScore > 0) {
      submitScore(finalScore);
    }
  }, []);

  const gameLoop = useCallback(() => {
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };
    
    // Apply buffered direction
    directionRef.current = nextDirectionRef.current;
    
    head.x += directionRef.current.x;
    head.y += directionRef.current.y;

    // Check Wall Collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // Check Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Check Food Collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      spawnFood();
      // Speed up
      speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
      // Re-setup interval with new speed
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(gameLoop, speedRef.current);
    } else {
      snake.pop(); // Remove tail if we didn't eat
    }

    snakeRef.current = snake;
    draw();
  }, [gameOver, spawnFood]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<=canvas.width; i+=CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e'; // Lighter head
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = index === 0 ? 10 : 0;
      
      // Calculate coordinates and padding
      const px = segment.x * CELL_SIZE;
      const py = segment.y * CELL_SIZE;
      
      // Create rounded rect effect
      ctx.beginPath();
      ctx.roundRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
      ctx.fill();
      
      ctx.shadowBlur = 0; // Reset shadow for next draws
      
      // Draw eyes on head
      if (index === 0) {
        ctx.fillStyle = '#000';
        const eyeSize = 2;
        // Direction based eye placement
        const dir = directionRef.current;
        let leftEye = {x: 0, y: 0}, rightEye = {x: 0, y: 0};
        
        if (dir.x === 1) { // Right
           leftEye = { x: px + 14, y: py + 6 }; rightEye = { x: px + 14, y: py + 14 };
        } else if (dir.x === -1) { // Left
           leftEye = { x: px + 6, y: py + 6 }; rightEye = { x: px + 6, y: py + 14 };
        } else if (dir.y === -1) { // Up
           leftEye = { x: px + 6, y: py + 6 }; rightEye = { x: px + 14, y: py + 6 };
        } else if (dir.y === 1) { // Down
           leftEye = { x: px + 6, y: py + 14 }; rightEye = { x: px + 14, y: py + 14 };
        }
        
        ctx.beginPath(); ctx.arc(leftEye.x, leftEye.y, eyeSize, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rightEye.x, rightEye.y, eyeSize, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Draw Food
    const fx = foodRef.current.x * CELL_SIZE;
    const fy = foodRef.current.y * CELL_SIZE;
    ctx.fillStyle = '#ef4444'; // Red-500
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(fx + CELL_SIZE/2, fy + CELL_SIZE/2, CELL_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const startGame = () => {
    setScore(0);
    scoreRef.current = 0;
    setNewHigh(false);
    snakeRef.current = [{ x: 5, y: 10 }];
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    speedRef.current = INITIAL_SPEED;
    spawnFood();
    setGameState('playing');

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(gameLoop, speedRef.current);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default scrolling for arrows and space
      if(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
          e.preventDefault();
      }

      const dir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'z': // AZERTY support
        case 'Z':
          if (dir.y === 0) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.y === 0) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'q':
        case 'Q':
          if (dir.x === 0) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.x === 0) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-12 px-4 relative">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-8 max-w-[400px]">
        <div className="flex flex-col">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Score</span>
          <span className="text-4xl font-black text-white">{score}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-yellow-500/80 text-sm font-semibold tracking-wider flex items-center gap-1">
            <Trophy size={14} /> High Score
          </span>
          <span className="text-2xl font-bold text-yellow-500">{highScore}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-[400px] aspect-square bg-[#0f172a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-green-500/10">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full block"
        />

        {/* Menu Overlay */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 border border-green-500/50">
                <LayoutGrid className="text-green-500" size={32} />
              </div>
              <h2 className="text-3xl font-bold mb-2">Snake TSI</h2>
              <p className="text-gray-400 mb-8 max-w-xs">Utilisez les flèches directionnelles (ou ZQSD/WASD) pour diriger le serpent. Atteignez le classement !</p>
              
              <button onClick={startGame} className="w-full py-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2">
                <Play fill="currentColor" size={20} /> Commencer
              </button>
            </motion.div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
            >
              <h2 className="text-3xl font-black mb-1 text-white">GAME OVER</h2>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-green-400">{score}</span>
                <span className="text-xl text-gray-500 font-bold">PTS</span>
              </div>
              
              {newHigh && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="bg-yellow-500/20 text-yellow-500 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 mb-6 border border-yellow-500/50"
                >
                  <Trophy size={16} /> NOUVEAU RECORD !
                </motion.div>
              )}
              
              {!newHigh && <div className="h-6 mb-6"></div>}

              <button onClick={startGame} className="w-full py-4 bg-white text-black hover:bg-gray-100 active:scale-95 font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-2">
                <RefreshCw size={20} /> Rejouer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
};

export default SnakeClient;

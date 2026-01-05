/**
 * ConstellationBackground - Interactive animated background with nodes and data flows
 * Creates a "living constellation" effect that responds to mouse movement
 */

import { useEffect, useRef, useCallback } from 'react';

const ConstellationBackground = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const nodesRef = useRef([]);
    const connectionsRef = useRef([]);
    const animationRef = useRef(null);

    // Configuration
    const CONFIG = {
        nodeCount: 80,
        nodeColor: 'rgba(255, 255, 255, 0.3)',
        nodeSize: { min: 1, max: 3 },
        connectionColor: 'rgba(161, 0, 255, 0.15)',
        pulseColor: '#A100FF',
        parallaxIntensity: 0.02,
        connectionDistance: 150,
        newConnectionInterval: 2000,
        pulseSpeed: 0.02,
    };

    // Initialize nodes with parallax layers
    const initNodes = useCallback((width, height) => {
        const nodes = [];
        for (let i = 0; i < CONFIG.nodeCount; i++) {
            const layer = Math.random(); // 0-1, determines parallax depth
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                baseX: Math.random() * width,
                baseY: Math.random() * height,
                size: CONFIG.nodeSize.min + Math.random() * (CONFIG.nodeSize.max - CONFIG.nodeSize.min),
                layer,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                opacity: 0.2 + layer * 0.5,
            });
        }
        return nodes;
    }, []);

    // Create a new connection with pulse animation
    const createConnection = useCallback(() => {
        const nodes = nodesRef.current;
        if (nodes.length < 2) return;

        // Find two nearby nodes
        const startIdx = Math.floor(Math.random() * nodes.length);
        const startNode = nodes[startIdx];

        // Find nearby nodes
        const nearbyNodes = nodes.filter((n, i) => {
            if (i === startIdx) return false;
            const dx = n.x - startNode.x;
            const dy = n.y - startNode.y;
            return Math.sqrt(dx * dx + dy * dy) < CONFIG.connectionDistance;
        });

        if (nearbyNodes.length > 0) {
            const endNode = nearbyNodes[Math.floor(Math.random() * nearbyNodes.length)];
            connectionsRef.current.push({
                start: startNode,
                end: endNode,
                progress: 0,
                fadeIn: 0,
                fadeOut: 1,
                pulsePosition: 0,
                hasPulse: Math.random() > 0.3,
            });
        }
    }, []);

    // Animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // Clear canvas
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, width, height);

        // Update and draw nodes
        const nodes = nodesRef.current;
        const mouse = mouseRef.current;

        nodes.forEach(node => {
            // Drift movement
            node.baseX += node.vx;
            node.baseY += node.vy;

            // Wrap around edges
            if (node.baseX < 0) node.baseX = width;
            if (node.baseX > width) node.baseX = 0;
            if (node.baseY < 0) node.baseY = height;
            if (node.baseY > height) node.baseY = 0;

            // Parallax effect based on mouse
            const parallaxX = (mouse.x - width / 2) * CONFIG.parallaxIntensity * node.layer;
            const parallaxY = (mouse.y - height / 2) * CONFIG.parallaxIntensity * node.layer;

            node.x = node.baseX + parallaxX;
            node.y = node.baseY + parallaxY;

            // Draw node
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${node.opacity * 0.4})`;
            ctx.fill();

            // Add subtle glow to larger nodes
            if (node.size > 2) {
                const gradient = ctx.createRadialGradient(
                    node.x, node.y, 0,
                    node.x, node.y, node.size * 4
                );
                gradient.addColorStop(0, `rgba(161, 0, 255, ${node.opacity * 0.2})`);
                gradient.addColorStop(1, 'rgba(161, 0, 255, 0)');
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        });

        // Update and draw connections
        const connections = connectionsRef.current;
        for (let i = connections.length - 1; i >= 0; i--) {
            const conn = connections[i];

            // Fade in
            if (conn.fadeIn < 1) {
                conn.fadeIn += 0.02;
            }

            // Progress pulse
            if (conn.hasPulse) {
                conn.pulsePosition += CONFIG.pulseSpeed;
            }

            // Start fade out after pulse completes
            if (conn.pulsePosition > 1.2) {
                conn.fadeOut -= 0.02;
            }

            // Remove completed connections
            if (conn.fadeOut <= 0) {
                connections.splice(i, 1);
                continue;
            }

            const opacity = Math.min(conn.fadeIn, conn.fadeOut);
            const { start, end } = conn;

            // Draw base connection line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = `rgba(161, 0, 255, ${0.15 * opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw pulse if active
            if (conn.hasPulse && conn.pulsePosition < 1.2) {
                const pulsePos = Math.max(0, Math.min(1, conn.pulsePosition));
                const pulseX = start.x + (end.x - start.x) * pulsePos;
                const pulseY = start.y + (end.y - start.y) * pulsePos;

                // Pulse glow
                const pulseGradient = ctx.createRadialGradient(
                    pulseX, pulseY, 0,
                    pulseX, pulseY, 20
                );
                pulseGradient.addColorStop(0, `rgba(161, 0, 255, ${0.8 * opacity})`);
                pulseGradient.addColorStop(0.5, `rgba(161, 0, 255, ${0.3 * opacity})`);
                pulseGradient.addColorStop(1, 'rgba(161, 0, 255, 0)');

                ctx.beginPath();
                ctx.arc(pulseX, pulseY, 20, 0, Math.PI * 2);
                ctx.fillStyle = pulseGradient;
                ctx.fill();

                // Bright pulse core
                ctx.beginPath();
                ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();

                // Trail effect
                for (let t = 0; t < 5; t++) {
                    const trailPos = pulsePos - (t * 0.05);
                    if (trailPos > 0) {
                        const trailX = start.x + (end.x - start.x) * trailPos;
                        const trailY = start.y + (end.y - start.y) * trailPos;
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, 2 - t * 0.3, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(161, 0, 255, ${(0.5 - t * 0.1) * opacity})`;
                        ctx.fill();
                    }
                }
            }
        }

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // Mouse move handler
    const handleMouseMove = useCallback((e) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    // Resize handler
    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Reinitialize nodes on resize
        nodesRef.current = initNodes(canvas.width, canvas.height);
    }, [initNodes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Initial setup
        handleResize();
        mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        // Start animation
        animate();

        // Create new connections periodically
        const connectionInterval = setInterval(createConnection, CONFIG.newConnectionInterval);

        // Event listeners
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationRef.current);
            clearInterval(connectionInterval);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, [animate, createConnection, handleMouseMove, handleResize]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
            }}
        />
    );
};

export default ConstellationBackground;

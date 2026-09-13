import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Path,
} from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scaled up proportions for high-impact mobile presentation
const GRAPHIC_WIDTH = Math.min(SCREEN_WIDTH - 32, 340);
const GRAPHIC_HEIGHT = 240;
const CENTER_X = GRAPHIC_WIDTH / 2;
const CENTER_Y = GRAPHIC_HEIGHT / 2;
const RX = Math.min(GRAPHIC_WIDTH * 0.32, 100);
const RY = 82;
const BADGE_SIZE = 46;
const BADGE_RADIUS = BADGE_SIZE / 2;

export function OrbitalHealthGraphic() {
  const [angle, setAngle] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = Date.now();
    const speed = (2 * Math.PI) / 15000; // Smooth 15-second orbit cycle

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      setAngle((prev) => (prev + speed * delta) % (2 * Math.PI));
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  // Center Heart Breathing / Pulse factor
  const heartPulse = 1 + 0.08 * Math.sin(angle * 4);
  const heartGlowOpacity = 0.82 + 0.18 * Math.sin(angle * 4);

  // 1. Running Person (Base offset: 310 deg)
  const radRunning = angle + (310 * Math.PI) / 180;
  const xRunning = CENTER_X + RX * Math.cos(radRunning) - BADGE_RADIUS;
  const yRunning = CENTER_Y + RY * Math.sin(radRunning) - BADGE_RADIUS;

  // 2. Bed / Sleep (Base offset: 35 deg)
  const radBed = angle + (35 * Math.PI) / 180;
  const xBed = CENTER_X + RX * Math.cos(radBed) - BADGE_RADIUS;
  const yBed = CENTER_Y + RY * Math.sin(radBed) - BADGE_RADIUS;

  // 3. Flame / Fire (Base offset: 135 deg)
  const radFire = angle + (135 * Math.PI) / 180;
  const xFire = CENTER_X + RX * Math.cos(radFire) - BADGE_RADIUS;
  const yFire = CENTER_Y + RY * Math.sin(radFire) - BADGE_RADIUS;

  // 4. Bar Chart / Stats (Base offset: 215 deg)
  const radChart = angle + (215 * Math.PI) / 180;
  const xChart = CENTER_X + RX * Math.cos(radChart) - BADGE_RADIUS;
  const yChart = CENTER_Y + RY * Math.sin(radChart) - BADGE_RADIUS;

  return (
    <View style={[styles.container, { width: GRAPHIC_WIDTH, height: GRAPHIC_HEIGHT }]}>
      {/* Concentric Energy SVG Rings */}
      <Svg
        width={GRAPHIC_WIDTH}
        height={GRAPHIC_HEIGHT}
        viewBox={`0 0 ${GRAPHIC_WIDTH} ${GRAPHIC_HEIGHT}`}
        style={styles.svg}
      >
        <Defs>
          {/* Heart Core Radial Glow */}
          <RadialGradient id="heartCoreGlowLarge" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.95" />
            <Stop offset="40%" stopColor="#E62E2E" stopOpacity="0.65" />
            <Stop offset="75%" stopColor="#5A0E14" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>

          {/* Center Heart Fill Gradient */}
          <SvgGradient id="heartFillGradLarge" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="50%" stopColor="#FFE0DB" />
            <Stop offset="100%" stopColor="#FF7A66" />
          </SvgGradient>

          {/* Ambient Orbital Atmosphere Glow */}
          <RadialGradient id="ambientOrbitGlowLarge" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C42028" stopOpacity="0.38" />
            <Stop offset="65%" stopColor="#300A10" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient background energy haze */}
        <Circle cx={CENTER_X} cy={CENTER_Y} r={120} fill="url(#ambientOrbitGlowLarge)" />

        {/* Outer Orbit Track Line */}
        <Circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={RX + 14}
          stroke="#38181E"
          strokeWidth="1.3"
          fill="none"
          opacity={0.65}
        />

        {/* Middle Main Orbit Track with glowing energy arc */}
        <Circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={RX}
          stroke="#551F26"
          strokeWidth="1.4"
          fill="none"
          opacity={0.75}
        />
        <Path
          d={`M ${CENTER_X - RX * 0.85} ${CENTER_Y + 30} Q ${CENTER_X} ${CENTER_Y + RY + 18} ${CENTER_X + RX * 0.85} ${CENTER_Y + 30}`}
          stroke="#FF5533"
          strokeWidth="1.8"
          strokeOpacity="0.5"
          fill="none"
        />

        {/* Inner Luminous Track */}
        <Circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={58}
          stroke="#8A2630"
          strokeWidth="1.5"
          fill="none"
          opacity={0.8}
        />

        {/* Inner Glowing Center Disc */}
        <Circle cx={CENTER_X} cy={CENTER_Y} r={42} fill="url(#heartCoreGlowLarge)" />
        <Circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={34}
          fill="#1C0609"
          stroke="#FF4A40"
          strokeWidth="1.8"
          strokeOpacity={heartGlowOpacity}
        />
      </Svg>

      {/* Prominent Pulsing Center Heart */}
      <View
        style={[
          styles.centerHeartWrapper,
          {
            top: CENTER_Y - 32,
            left: CENTER_X - 32,
            transform: [{ scale: heartPulse }],
          },
        ]}
      >
        <Svg width={36} height={34} viewBox="0 0 24 24">
          <Defs>
            <SvgGradient id="centerHeartFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="50%" stopColor="#FFE0DB" />
              <Stop offset="100%" stopColor="#FF7A66" />
            </SvgGradient>
          </Defs>
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#centerHeartFillGrad)"
          />
        </Svg>
      </View>

      {/* 1. Orbiting Running Badge */}
      <View style={[styles.orbitBadge, { left: xRunning, top: yRunning }]}>
        <FontAwesome5 name="running" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
      </View>

      {/* 2. Orbiting Bed / Sleep Badge */}
      <View style={[styles.orbitBadge, { left: xBed, top: yBed }]}>
        <Ionicons name="bed" size={19} color="#DCEBFF" />
      </View>

      {/* 3. Orbiting Fire / Flame Badge */}
      <View style={[styles.orbitBadge, { left: xFire, top: yFire }]}>
        <MaterialCommunityIcons name="fire" size={23} color="#FF6E2E" />
      </View>

      {/* 4. Orbiting Bar Chart / Stats Badge */}
      <View style={[styles.orbitBadge, { left: xChart, top: yChart }]}>
        <Ionicons name="stats-chart" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  centerHeartWrapper: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4D40',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 5,
  },
  orbitBadge: {
    position: 'absolute',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_RADIUS,
    backgroundColor: '#1E171E',
    borderWidth: 1.4,
    borderColor: '#4A2832',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 6,
  },
});

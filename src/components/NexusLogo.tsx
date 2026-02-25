import React from 'react';
import Svg, { Rect, G, Path, Circle } from 'react-native-svg';

interface Props {
    size?: number;
    color?: string;
    opacity?: number;
}

export default function NexusLogo({ size = 100, color = '#6366F1', opacity = 1 }: Props) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
            {/* Fondo sutil */}
            <Rect x="5" y="5" width="90" height="90" rx="20" fill={color} fillOpacity={0.05 * opacity} />

            {/* Marcos de las esquinas */}
            <G stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
                <Path d="M35 15H20C17.2386 15 15 17.2386 15 20V35" />
                <Path d="M65 15H80C82.7614 15 85 17.2386 85 20V35" />
                <Path d="M35 85H20C17.2386 85 15 82.7614 15 80V65" />
                <Path d="M65 85H80C82.7614 85 85 82.7614 85 80V65" />
            </G>

            {/* El Rayo */}
            <Path
                d="M55 25L35 55H48L42 75L62 45H49L55 25Z"
                fill={color}
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                opacity={opacity}
            />

            {/* Punto de conexión */}
            <Circle cx="50" cy="50" r="2" fill={color} fillOpacity={0.3 * opacity} />
        </Svg>
    );
}

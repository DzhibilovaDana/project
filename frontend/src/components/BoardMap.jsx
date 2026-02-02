// frontend/src/components/BoardMap.jsx
import React from 'react';
import de10Image from '../de10-lite.jpg';

/**
 * BoardMap
 * Props:
 *  - leftPins: array of pin names (left column)
 *  - rightPins: array of pin names (right column)
 *  - pinColorMap: { pinName: '#rrggbb' }  // если пин задействован, его цвет
 *  - peripheralColorMap: { peripheralName: '#rrggbb' }  // для легенды
 *  - selectedDe10: pinName
 *  - onPinClick(pinName)
 */
export default function BoardMap({
  leftPins = [],
  rightPins = [],
  pinColorMap = {},
  peripheralColorMap = {},
  selectedDe10 = null,
  onPinClick = () => {}
}) {
  // helper: determine readable text color (black or white) based on background
  const getContrastColor = (hex) => {
    if (!hex) return '#fff';
    const h = hex.replace('#', '');
    const r = parseInt(h.substr(0,2), 16);
    const g = parseInt(h.substr(2,2), 16);
    const b = parseInt(h.substr(4,2), 16);
    // luminance formula
    const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
    return luminance > 0.6 ? '#111' : '#fff';
  };

  const renderPinButton = (pin) => {
    const color = pinColorMap[pin];
    const isSelected = selectedDe10 === pin;
    const style = color ? {
      background: color,
      color: getContrastColor(color),
      boxShadow: '0 6px 14px rgba(0,0,0,0.18)'
    } : undefined;

    const className = `board-pin ${isSelected ? 'selected' : ''} ${color ? 'has-color' : ''}`;

    return (
      <button
        key={pin}
        className={className}
        onClick={() => onPinClick(pin)}
        title={pin}
        style={style}
      >
        <span className="pin-label">{pin}</span>
      </button>
    );
  };

  return (
    <div className="board-container" aria-label="Board map">
      <div className="board-inner">
        <div className="pins-column pins-left">
          {leftPins.map((p, idx) => renderPinButton(p))}
        </div>

        <div className="board-visual" role="img" aria-label="DE10 board image">
          <div className="board-image-wrapper">
            <img src={de10Image} className="board-image" alt="DE10-Lite board" />
          </div>
        </div>

        <div className="pins-column pins-right">
          {rightPins.map((p, idx) => renderPinButton(p))}
        </div>
      </div>

      <div className="board-legend" aria-hidden="false">
        {Object.keys(peripheralColorMap).length === 0 ? (
          <div style={{ color: '#fff', opacity: 0.75 }}>No peripheral colors defined</div>
        ) : (
          Object.keys(peripheralColorMap).map((name) => (
            <div key={name} className="legend-item">
              <span className="legend-swatch" style={{ background: peripheralColorMap[name] }} />
              <span className="legend-name">{name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

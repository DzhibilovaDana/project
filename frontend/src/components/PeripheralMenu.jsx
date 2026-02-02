// frontend/src/components/PeripheralMenu.jsx
import React, { useState } from 'react';

/**
 * PeripheralMenu
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - peripherals: [{ name, pins: [], color }, ...]
 *  - buttonStates: [{id, pressed}, ...]
 *  - toggleButton(buttonId): fn
 *  - onSelectPeripheralPin(peripheralName, pinName): fn
 *  - connections: [{ peripheral, peripheralPin, de10Pin }]
 */
export default function PeripheralMenu({
  open,
  onClose,
  peripherals = [],
  buttonStates = [],
  toggleButton,
  onSelectPeripheralPin = () => {},
  connections = []
}) {
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  if (!open) return null;

  const peripheralHasPinConnected = (peripheralName, pin) =>
    connections.some(c => c.peripheral === peripheralName && c.peripheralPin === pin);

  const getConnectedDe10 = (peripheralName, pin) => {
    const found = connections.find(c => c.peripheral === peripheralName && c.peripheralPin === pin);
    return found ? found.de10Pin : null;
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 400 }}>
      <div className="modal-window" style={{ maxWidth: 1000 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="modal-title">Периферия и кнопки</div>
          <div>
            <button className="close-btn" onClick={onClose}>Закрыть</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          {/* Left column: peripherals */}
          <div style={{ flex: 1, minWidth: 360 }}>
            {peripherals.map((p) => (
              <div key={p.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 14, height: 14, borderRadius: 3,
                      background: p.color, boxShadow: '0 1px 6px rgba(0,0,0,0.25)'
                    }} />
                    <div style={{ fontWeight: 700, color: '#ffe600' }}>{p.name}</div>
                  </div>

                  <div>
                    <button
                      className="control-button"
                      onClick={() => toggleExpand(p.name)}
                      style={{ padding: '6px 10px', borderRadius: 6 }}
                    >
                      {expanded[p.name] ? '–' : '+'}
                    </button>
                  </div>
                </div>

                {expanded[p.name] && (
                  <div className="pins-list" style={{ marginTop: 8 }}>
                    {p.pins.map(pin => {
                      const connected = peripheralHasPinConnected(p.name, pin);
                      const de10 = getConnectedDe10(p.name, pin);
                      return (
                        <div className="pin-container" key={`${p.name}-${pin}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <button
                            className={`pin-btn ${connected ? 'connected' : ''}`}
                            onClick={() => {
                              onSelectPeripheralPin(p.name, pin);
                              onClose();
                            }}
                            title={pin}
                          >
                            {pin}
                          </button>
                          {connected && (
                            <div style={{ fontSize: 12, color: '#fff', opacity: 0.85 }}>
                              → {de10}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: '#333', minHeight: 240 }} />

          {/* Right column: buttons and connections */}
          <div style={{ width: 360 }}>
            <div style={{ fontWeight: 700, color: '#ffe600', marginBottom: 8 }}>Кнопки управления</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {buttonStates.map(btn => (
                <div key={btn.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className={`control-button round ${btn.pressed ? 'pressed' : ''}`}
                    onClick={() => toggleButton && toggleButton(btn.id)}
                    title={btn.id}
                    style={{ width: 44, height: 44 }}
                  >
                    {btn.id.replace('but','')}
                  </button>
                  <div style={{ color: '#fff', minWidth: 60 }}>{btn.id}</div>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, color: '#ffe600', marginBottom: 8 }}>Текущие подключения</div>
            <div style={{ maxHeight: 240, overflow: 'auto', paddingRight: 8 }}>
              {connections.length === 0 && <div style={{ color: '#aaa' }}>Нет подключений</div>}
              {connections.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #222' }}>
                  <div style={{ color: '#fff' }}>{c.peripheral} — {c.peripheralPin}</div>
                  <div style={{ color: '#ffe600' }}>{c.de10Pin}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, color: '#ffe600', marginBottom: 6 }}>Подсказка</div>
              <div style={{ color: '#ddd', fontSize: 13 }}>
                Выберите пин в списке периферии — меню закроется, затем нажмите на пин на плате, чтобы подключить.
                Если кликнуть по занятому пину платы (без выбора периферии) — соединение удалится.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

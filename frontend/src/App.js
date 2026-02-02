// frontend/src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import BoardMap from './components/BoardMap';
import PeripheralMenu from './components/PeripheralMenu';

// Описание периферии с цветами (можно скорректировать цвета)
const peripherals = [
  { name: 'Arduino MEGA', pins: ['22','24','26','28','30','32','34','36','38','40','42','44'], color: '#FF7043' }, // orange
  { name: 'LED-массив', pins: ['led1','led2','led3','led4','led5','led6','led7','RGB1','RGB2','RGB3'], color: '#FFEB3B' }, // yellow
  { name: 'Семисегментник', pins: ['A','B','C','D','E','F','G','DP','DIG1','DIG2','DIG3','DIG4'], color: '#4FC3F7' }, // light blue
  { name: 'Сервопривод', pins: ['serv1'], color: '#A1887F' } // brown/steel
];

const de10PinsLeft = [
  'V10','V9','V8','V7','W6','W5','AA14','W12','AB12','AB11','AB10','AA9','AA8','AA7','AA6','AA5','AB3','AB2'
];
const de10PinsRight = [
  'W10','W9','W8','W7','V5','AA15','W13','AB13','Y11','W11','AA10','Y8','Y7','Y6','Y5','Y4','Y3','AA2'
];

function App() {
  // State
  const [connections, setConnections] = useState([]); // { peripheral, peripheralPin, de10Pin }
  const [showPeripheralMenu, setShowPeripheralMenu] = useState(false);
  const [selectedPeripheral, setSelectedPeripheral] = useState(null); // { peripheral, peripheralPin }
  const [selectedDe10, setSelectedDe10] = useState(null);

  const [buttonStates, setButtonStates] = useState(Array.from({ length: 12 }, (_, i) => ({ id: `but${i+1}`, pressed: false })));

  // SOF upload / files
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [sofFiles, setSofFiles] = useState([]);
  const [selectedSof, setSelectedSof] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Peripheral color map for BoardMap legend
  const peripheralColorMap = useMemo(() => {
    const map = {};
    peripherals.forEach(p => map[p.name] = p.color);
    return map;
  }, []);

  // pinColorMap: de10Pin -> color (derived from connections)
  const pinColorMap = useMemo(() => {
    const m = {};
    connections.forEach(c => {
      const p = peripherals.find(pp => pp.name === c.peripheral);
      if (p && p.color) m[c.de10Pin] = p.color;
    });
    return m;
  }, [connections]);

  // ---- backend calls and helpers (copied/adapted from original) ----

  const sendButtonState = async (buttonId, pressed) => {
    try {
      await fetch('http://localhost:5050/api/buttons/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonId, pressed })
      });
    } catch (error) {
      console.error('Ошибка отправки состояния кнопки:', error);
    }
  };

  const toggleButton = (buttonId) => {
    setButtonStates(prev =>
      prev.map(btn => {
        if (btn.id === buttonId) {
          const newPressed = !btn.pressed;
          sendButtonState(buttonId, newPressed);
          return { ...btn, pressed: newPressed };
        }
        return btn;
      })
    );
  };

  // File upload
  const handleFileUpload = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (!file.name.toLowerCase().endsWith('.sof')) {
      setUploadStatus('Ошибка: поддерживаются только файлы формата .sof');
      return;
    }
    setUploadStatus('Загрузка...');
    try {
      const fm = new FormData();
      fm.append('file', file);
      const resp = await fetch('http://localhost:5050/api/pins/upload_sof', {
        method: 'POST',
        body: fm
      });
      const json = await resp.json();
      if (resp.ok) {
        setUploadStatus('Файл успешно загружен');
        fetchSofFiles();
      } else {
        setUploadStatus('Ошибка загрузки: ' + (json.error || 'unknown'));
      }
    } catch (e) {
      setUploadStatus('Ошибка: ' + e.message);
    }
  };

  const fetchSofFiles = async () => {
    try {
      const resp = await fetch('http://localhost:5050/api/pins/sof_files');
      const json = await resp.json();
      setSofFiles(json.files || []);
    } catch (e) {
      setSofFiles([]);
    }
  };

  useEffect(() => {
    fetchSofFiles();
    handleLoad();
    // eslint-disable-next-line
  }, []);

  const handleProgramDe10 = async () => {
    if (!selectedSof) return;
    setUploadStatus('Программирование...');
    try {
      const resp = await fetch('http://localhost:5050/api/pins/program_de10', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sof_path: selectedSof })
      });
      const json = await resp.json();
      if (resp.ok) setUploadStatus('Плата DE10 успешно прошита!');
      else setUploadStatus('Ошибка прошивки: ' + (json.error || 'Неизвестная ошибка'));
    } catch (e) {
      setUploadStatus('Ошибка: ' + e.message);
    }
  };

  // Save: POST config, GET verilog, POST program
  const handleSave = async () => {
    const connectionsArr = connections.map(({ de10Pin, peripheralPin }) => [de10Pin, peripheralPin]);
    try {
      setSaveStatus('Сохранение конфигурации...');
      const saveResp = await fetch('http://localhost:5050/api/pins/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections: connectionsArr })
      });
      if (!saveResp.ok) throw new Error('Failed to save configuration');

      setSaveStatus('Генерация Verilog...');
      const verilogResp = await fetch('http://localhost:5050/api/pins/verilog');
      const verilogData = await verilogResp.json();
      console.log('verilog', verilogData.verilog_code);

      setSaveStatus('Программирование FPGA...');
      const programResp = await fetch('http://localhost:5050/api/pins/program', { method: 'POST' });
      const programJson = await programResp.json();
      if (programResp.ok) {
        alert('Конфигурация успешно применена!');
      } else {
        throw new Error(programJson.error || 'Failed to program FPGA');
      }
    } catch (e) {
      alert('Ошибка применения конфигурации: ' + e.message);
    } finally {
      setSaveStatus('');
    }
  };

  // Load config
  const handleLoad = async () => {
    try {
      const resp = await fetch('http://localhost:5050/api/pins/config');
      const data = await resp.json();
      if (Array.isArray(data.connections)) {
        const newConnections = data.connections.map(([de10Pin, peripheralPin]) => {
          let peripheral = '';
          for (const p of peripherals) {
            if (p.pins.includes(peripheralPin)) { peripheral = p.name; break; }
          }
          return { peripheral, peripheralPin, de10Pin };
        });
        setConnections(newConnections);
      } else if (data && data.connections && typeof data.connections === 'object') {
        // maybe object form
        setConnections([]);
      }
    } catch (e) {
      console.error('Error loading config', e);
    }
  };

  const exportConnections = () => {
    const json = JSON.stringify({ connections: connections.map(({de10Pin, peripheralPin}) => [de10Pin, peripheralPin]) }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'connections.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- Board/Peripheral logic ----

  const onPeripheralPinSelected = (peripheralName, peripheralPin) => {
    setSelectedPeripheral({ peripheral: peripheralName, peripheralPin });
    setSelectedDe10(null);
    setShowPeripheralMenu(false);
  };

  const handleBoardPinClick = (de10Pin) => {
    if (selectedPeripheral) {
      setConnections(prev => {
        // remove any existing that matches peripheral+pin or de10Pin
        const filtered = prev.filter(c =>
          !(c.peripheral === selectedPeripheral.peripheral && c.peripheralPin === selectedPeripheral.peripheralPin)
          && !(c.de10Pin === de10Pin)
        );
        filtered.push({
          peripheral: selectedPeripheral.peripheral,
          peripheralPin: selectedPeripheral.peripheralPin,
          de10Pin
        });
        return filtered;
      });
      setSelectedPeripheral(null);
      setSelectedDe10(de10Pin);
    } else {
      // no peripheral selected: if pin occupied -> remove, else just select/highlight
      const existing = connections.find(c => c.de10Pin === de10Pin);
      if (existing) {
        setConnections(prev => prev.filter(c => c.de10Pin !== de10Pin));
        setSelectedDe10(null);
      } else {
        setSelectedDe10(de10Pin);
      }
    }
  };

  // helper: get map of used de10 pins
  const usedDe10Pins = connections.map(c => c.de10Pin);

  return (
    <div className="app-container">
      {/* TOP: Video — Оставлено как в оригинале */}
      <div className="video-container">
        <div className="video-placeholder">Видео трансляция</div>
      </div>

      {/* Header with + and selected peripheral hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h2 style={{ margin: 0, color: '#ffffff' }}>FPGA Pin Map</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedPeripheral ? (
            <div style={{ color: '#fff', fontWeight: 600 }}>
              Выбрано: <span style={{ color: '#ffd54f' }}>{selectedPeripheral.peripheral} — {selectedPeripheral.peripheralPin}</span>
              <span style={{ marginLeft: 10, fontWeight: 400, color: '#ddd' }}>(Нажмите пин платы чтобы подключить)</span>
            </div>
          ) : (
            <div style={{ color: '#ddd' }}>Периферию можно выбрать по +</div>
          )}

          <button
            className="control-button"
            onClick={() => setShowPeripheralMenu(true)}
            title="Открыть меню периферии"
            style={{ fontSize: 18, padding: '6px 10px', borderRadius: 8 }}
          >
            +
          </button>
        </div>
      </div>

      {/* CENTER: BoardMap */}
      <BoardMap
        leftPins={de10PinsLeft}
        rightPins={de10PinsRight}
        pinColorMap={pinColorMap}
        peripheralColorMap={peripheralColorMap}
        selectedDe10={selectedDe10}
        onPinClick={handleBoardPinClick}
      />

      {/* BOTTOM: сохраняем оригинальную нижнюю панель функционала */}
      <div className="bottom-controls" style={{ marginTop: 18 }}>
        <div className="file-upload-container">
          <label className="file-upload-label" htmlFor="sof-upload">Выберите .sof файл</label>
          <input id="sof-upload" className="file-input" type="file" accept=".sof" onChange={handleFileUpload} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <select value={selectedSof} onChange={e => setSelectedSof(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
              <option value="">Выберите .sof файл для прошивки</option>
              {sofFiles.map((f, idx) => <option key={idx} value={f}>{f}</option>)}
            </select>
            <button className="compile-btn" onClick={handleProgramDe10} disabled={!selectedSof}>Программировать</button>
          </div>

          <div style={{ marginTop: 8 }}>
            <div className={`upload-status ${uploadStatus.toLowerCase().includes('ошиб') ? 'error' : ''} ${uploadStatus.toLowerCase().includes('успеш') ? 'success' : ''}`}>
              {uploadStatus || 'Статус загрузки: —'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="export-btn" onClick={exportConnections}>Экспорт</button>
          <button className="code-btn" onClick={handleSave} disabled={saveStatus !== ''}>{saveStatus || 'Save'}</button>
          <button className="close-btn" onClick={handleLoad}>Load</button>
        </div>
      </div>

      {/* Peripheral menu modal */}
      <PeripheralMenu
        open={showPeripheralMenu}
        onClose={() => setShowPeripheralMenu(false)}
        peripherals={peripherals}
        buttonStates={buttonStates}
        toggleButton={toggleButton}
        onSelectPeripheralPin={onPeripheralPinSelected}
        connections={connections}
      />
    </div>
  );
}

export default App;

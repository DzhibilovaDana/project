import React, { useState, useEffect } from 'react';
import './App.css';
import de10Image from './de10-lite.jpg'; // Используем jpg
import lampImg from './lamp.jpg';
import semiImg from './semi.jpg';
import servoImg from './servo.jpg';

// Примерные данные периферий и их пинов (теперь из perif.csv)
const peripherals = [
  {
    name: 'Arduino MEGA',
    pins: ['22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44'],
  },
  {
    name: 'LED-массив',
    pins: ['led1', 'led2', 'led3', 'led4', 'led5', 'led6', 'led7', 'RGB1', 'RGB2', 'RGB3'],
  },
  {
    name: 'Семисегментник',
    pins: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP', 'DIG1', 'DIG2', 'DIG3', 'DIG4'],
  },
  {
    name: 'Сервопривод',
    pins: ['serv1'],
  },
];

// Пины DE10-Lite (разделение на левый и правый ряд, по 18 пинов)
const de10PinsLeft = [
  'V10', 'V9', 'V8', 'V7', 'W6', 'W5', 'AA14', 'W12', 'AB12', 'AB11', 'AB10', 'AA9', 'AA8', 'AA7', 'AA6', 'AA5', 'AB3', 'AB2'
];
const de10PinsRight = [
  'W10', 'W9', 'W8', 'W7', 'V5', 'AA15', 'W13', 'AB13', 'Y11', 'W11', 'AA10', 'Y8', 'Y7', 'Y6', 'Y5', 'Y4', 'Y3', 'AA2'
];

function App() {
  const [selectedPin, setSelectedPin] = useState(null);
  const [connections, setConnections] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState('');
  const [buttonStates, setButtonStates] = useState(
    Array.from({ length: 12 }, (_, i) => ({ id: `but${i + 1}`, pressed: false }))
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [sofFiles, setSofFiles] = useState([]);
  const [selectedSof, setSelectedSof] = useState('');

  const handlePinClick = (peripheralIdx, pinIdx) => {
    const peripheral = peripherals[peripheralIdx].name;
    const peripheralPin = peripherals[peripheralIdx].pins[pinIdx];
    
    // Проверяем, есть ли уже соединение для этого пина
    const existingConnection = connections.find(
      c => c.peripheral === peripheral && c.peripheralPin === peripheralPin
    );
    
    // Если соединение существует, удаляем его
    if (existingConnection) {
      setConnections(prev => prev.filter(
        c => !(c.peripheral === peripheral && c.peripheralPin === peripheralPin)
      ));
    } else {
      // Если соединения нет, показываем селектор для выбора нового пина
      setSelectedPin({ peripheralIdx, pinIdx });
      setShowSelector(true);
    }
  };

  const handleDe10PinSelect = (de10Pin) => {
    const { peripheralIdx, pinIdx } = selectedPin;
    const peripheral = peripherals[peripheralIdx].name;
    const peripheralPin = peripherals[peripheralIdx].pins[pinIdx];
    
    // Добавляем новое соединение
    setConnections((prev) => [
      ...prev.filter(
        (c) => !(c.peripheral === peripheral && c.peripheralPin === peripheralPin)
      ),
      { peripheral, peripheralPin, de10Pin },
    ]);
    setShowSelector(false);
    setSelectedPin(null);
  };

  // Экспорт связей в JSON (только официальные имена)
  const exportConnectionsJson = () => {
    const connectionsArr = connections.map(({ de10Pin, peripheralPin }) => [de10Pin, peripheralPin]);
    const jsonData = {
      connections: connectionsArr
    };
    const json = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connections.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // Получить список занятых пинов DE10-lite
  const usedDe10Pins = connections.map((c) => c.de10Pin);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('Выбран файл:', file.name);
      
      // Проверяем расширение файла
      if (!file.name.toLowerCase().endsWith('.sof')) {
        console.log('Неверное расширение файла');
        setUploadStatus('Ошибка: поддерживаются только файлы формата .sof');
        return;
      }

      setSelectedFile(file);
      setUploadStatus('Загрузка...');

      try {
        // Создаем FormData для отправки файла
        const formData = new FormData();
        formData.append('file', file);
        console.log('Отправка файла на сервер...');

        // Отправляем файл на сервер
        const response = await fetch('http://localhost:5050/api/pins/upload_sof', {
          method: 'POST',
          body: formData,
        });

        console.log('Ответ сервера:', response.status);
        const result = await response.json();
        console.log('Результат:', result);

        if (response.ok) {
          setUploadStatus('Файл успешно загружен');
        } else {
          throw new Error(result.error || 'Ошибка загрузки файла');
        }
      } catch (error) {
        console.error('Ошибка при загрузке файла:', error);
        setUploadStatus('Ошибка загрузки файла: ' + error.message);
      }
    }
  };

  const fetchSofFiles = async () => {
    try {
      const filesResp = await fetch('http://localhost:5050/api/pins/sof_files');
      const filesData = await filesResp.json();
      setSofFiles(filesData.files || []);
    } catch (error) {
      setSofFiles([]);
    }
  };

  useEffect(() => {
    fetchSofFiles();
  }, [uploadStatus]); // обновлять список после загрузки

  const handleProgramDe10 = async () => {
    if (!selectedSof) return;
    setUploadStatus('Программирование...');
    try {
      const response = await fetch('http://localhost:5050/api/pins/program_de10', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sof_path: selectedSof })
      });
      const result = await response.json();
      if (response.ok) {
        setUploadStatus('Плата DE10 успешно прошита!');
      } else {
        setUploadStatus('Ошибка прошивки: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      setUploadStatus('Ошибка при прошивке: ' + error.message);
    }
  };

  // Сохранить соединения в JSON (только официальные имена)
  const handleSave = async () => {
    const connectionsArr = connections.map(({ de10Pin, peripheralPin }) => [de10Pin, peripheralPin]);
    try {
      // 1. Сохранение конфигурации
      setSaveStatus('Сохранение конфигурации...');
      console.log('Saving configuration:', connectionsArr);
      const saveResponse = await fetch('http://localhost:5050/api/pins/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections: connectionsArr })
      });
      if (!saveResponse.ok) {
        throw new Error('Failed to save configuration');
      }
      console.log('Configuration saved successfully');

      // 2. Генерация Verilog
      setSaveStatus('Генерация Verilog...');
      console.log('Generating Verilog...');
      const verilogResponse = await fetch('http://localhost:5050/api/pins/verilog');
      const verilogData = await verilogResponse.json();
      if (verilogData.verilog_code) {
        console.log('Generated Verilog code:', verilogData.verilog_code);
      } else {
        console.error('No Verilog code in response');
      }

      // 3. Программирование FPGA
      setSaveStatus('Программирование FPGA...');
      console.log('Programming FPGA...');
      const programResponse = await fetch('http://localhost:5050/api/pins/program', {
        method: 'POST'
      });
      const programData = await programResponse.json();
      
      if (programResponse.ok) {
        console.log('FPGA programming result:', programData.message);
        alert('Конфигурация успешно применена!');
      } else {
        console.error('FPGA programming error:', programData.error);
        throw new Error(programData.error || 'Failed to program FPGA');
      }
    } catch (error) {
      console.error('Error in save process:', error);
      alert('Ошибка применения конфигурации: ' + error.message);
    } finally {
      setSaveStatus('');
    }
  };

  // Загрузить соединения из JSON (только официальные имена)
  const handleLoad = async () => {
    try {
      const response = await fetch('http://localhost:5050/api/pins/config');
      const data = await response.json();
      if (Array.isArray(data.connections)) {
        // Формат: [de10Pin, peripheralPin]
        const newConnections = data.connections.map(([de10Pin, peripheralPin]) => {
          let peripheral = '';
          for (const p of peripherals) {
            if (p.pins.includes(peripheralPin)) {
              peripheral = p.name;
              break;
            }
          }
          return { peripheral, peripheralPin, de10Pin };
        });
        setConnections(newConnections);
        console.log('Loaded connections:', newConnections);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Ошибка загрузки конфигурации');
    }
  };

  return (
    <div className="app-container">
      {/* Видео окно */}
      <div className="video-container">
        <div className="video-placeholder">
          Видео трансляция
        </div>
      </div>

      {/* Кнопки управления и Arduino MEGA — один блок: сверху кнопки, снизу пины */}
      <div className="peripheral-block" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="but-arduino-grid" style={{ gridTemplateRows: '1fr 1fr' }}>
          {/* Первый ряд — круглые кнопки управления */}
          {buttonStates.map((btn, idx) => (
            <div className="but-arduino-cell" key={`but-cell-${btn.id}`}> 
              <button
                className={`control-button round ${btn.pressed ? 'pressed' : ''}`}
                onClick={() => toggleButton(btn.id)}
              >
                {btn.id}
              </button>
            </div>
          ))}
          {/* Второй ряд — пины Arduino MEGA */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const pin = peripherals[0].pins[idx];
            if (!pin) return <div className="but-arduino-cell" key={`pin-cell-empty-${idx}`}></div>;
            const connected = connections.find(
              (c) => c.peripheral === 'Arduino MEGA' && c.peripheralPin === pin
            );
            return (
              <div className="but-arduino-cell" key={`pin-cell-${pin}`}> 
                <button
                  className={`pin-btn${connected ? ' connected' : ''}`}
                  onClick={() => handlePinClick(0, idx)}
                >
                  {pin}
                  {connected && <span className="de10-label">→ {connected.de10Pin}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="peripheral-title">Панель кнопок</div>
      </div>

      {/* Остальные периферии */}
      <div className="peripherals-container">
        {peripherals.slice(1).map((peripheral, pIdx) => (
          <div className="peripheral-row" key={peripheral.name}>
            {peripheral.name === 'LED-массив' && (
              <img src={lampImg} alt="LED-массив" className="peripheral-icon" />
            )}
            {peripheral.name === 'Семисегментник' && (
              <img src={semiImg} alt="Семисегментник" className="peripheral-icon" />
            )}
            {peripheral.name === 'Сервопривод' && (
              <img src={servoImg} alt="Сервопривод" className="peripheral-icon" />
            )}
            <div className="peripheral-block">
              <div className="pins-list">
                {peripheral.pins.map((pin, pinIdx) => {
                  const connected = connections.find(
                    (c) => c.peripheral === peripheral.name && c.peripheralPin === pin
                  );
                  return (
                    <div key={pin} className="pin-container">
                      <button
                        className={`pin-btn${connected ? ' connected' : ''}`}
                        onClick={() => handlePinClick(pIdx + 1, pinIdx)}
                      >
                        {pin}
                        {connected && <span className="de10-label">→ {connected.de10Pin}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="peripheral-title">{peripheral.name}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Нижняя панель управления */}
      <div className="bottom-controls">
        <div className="file-upload-container">
          <input
            type="file"
            id="file-upload"
            onChange={handleFileUpload}
            className="file-input"
            accept=".sof"
          />
          <label htmlFor="file-upload" className="file-upload-label">
            {selectedFile ? selectedFile.name : 'Выберите .sof файл'}
          </label>
          {uploadStatus && (
            <div className={`upload-status ${uploadStatus.includes('Ошибка') ? 'error' : 'success'}`}>
              {uploadStatus}
            </div>
          )}
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <select
            value={selectedSof}
            onChange={e => setSelectedSof(e.target.value)}
            style={{marginBottom:8, minWidth:220}}
          >
            <option value="">Выберите .sof файл для прошивки</option>
            {sofFiles.map(f => (
              <option key={f} value={f}>{f.split('/').pop()}</option>
            ))}
          </select>
          <button 
            className="compile-btn" 
            onClick={handleProgramDe10}
            disabled={!selectedSof}
          >
            Программировать
          </button>
        </div>
        <button 
          className="compile-btn" 
          onClick={handleSave}
          disabled={saveStatus !== ''}
        >
          {saveStatus || 'Save'}
        </button>
        <button className="compile-btn" onClick={handleLoad}>Load</button>
      </div>

      {/* Модальное окно выбора пина DE10-Lite */}
      {showSelector && (
        <div className="de10-modal">
          <div className="de10-layout">
            <img src={de10Image} alt="DE10-Lite" className="de10-img-vertical" />
            <div className="de10-pins-scroll-area-fixed">
              {de10PinsLeft.map((pin, idx) => (
                <div className="de10-pin-row" key={pin + de10PinsRight[idx]}> 
                  <span className="de10-pin-label left">{pin}</span>
                  <button
                    className={`de10-pin-dot${(pin === '5V' || pin === '3.3V' || pin === 'GND') ? ' power' : ''}${connections.some(c => c.de10Pin === pin) ? ' used' : ''}`}
                    onClick={() => !connections.some(c => c.de10Pin === pin) && pin !== '5V' && pin !== '3.3V' && pin !== 'GND' && handleDe10PinSelect(pin)}
                    disabled={connections.some(c => c.de10Pin === pin) || pin === '5V' || pin === '3.3V' || pin === 'GND'}
                  />
                  <button
                    className={`de10-pin-dot${(de10PinsRight[idx] === '5V' || de10PinsRight[idx] === '3.3V' || de10PinsRight[idx] === 'GND') ? ' power' : ''}${connections.some(c => c.de10Pin === de10PinsRight[idx]) ? ' used' : ''}`}
                    onClick={() => !connections.some(c => c.de10Pin === de10PinsRight[idx]) && de10PinsRight[idx] !== '5V' && de10PinsRight[idx] !== '3.3V' && de10PinsRight[idx] !== 'GND' && handleDe10PinSelect(de10PinsRight[idx])}
                    disabled={connections.some(c => c.de10Pin === de10PinsRight[idx]) || de10PinsRight[idx] === '5V' || de10PinsRight[idx] === '3.3V' || de10PinsRight[idx] === 'GND'}
                  />
                  <span className="de10-pin-label right">{de10PinsRight[idx]}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="close-btn" onClick={() => setShowSelector(false)}>Отмена</button>
        </div>
      )}
    </div>
  );
}

export default App;

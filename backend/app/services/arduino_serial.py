import serial
import threading

class ArduinoSerialService:
    def __init__(self, port='/dev/tty.usbmodem1101', baudrate=9600):
        self.port = port
        self.baudrate = baudrate
        self.lock = threading.Lock()

    def send_button_state(self, button_id, pressed):
        try:
            n = ''.join(filter(str.isdigit, button_id))
            state_str = 'включена' if pressed else 'выключена'
            print(f'кнопка номер {n} {state_str}')
            with self.lock:
                with serial.Serial(self.port, self.baudrate, timeout=1) as ser:
                    cmd = f"{button_id}:{int(pressed)}\n"
                    ser.write(cmd.encode())
        except Exception as e:
            raise RuntimeError(f"Serial send error: {e}")

# Глобальный экземпляр (порт можно будет переопределить при необходимости)
arduino_serial = ArduinoSerialService() 
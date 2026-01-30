from flask import Blueprint, request, jsonify
from app.services.arduino_serial import arduino_serial

bp = Blueprint('buttons', __name__, url_prefix='/api/buttons')

@bp.route('/state', methods=['POST'])
def button_state():
    data = request.get_json()
    button_id = data.get('buttonId')
    pressed = data.get('pressed')
    if button_id is None or pressed is None:
        return jsonify({'error': 'Missing buttonId or pressed'}), 400
    try:
        arduino_serial.send_button_state(button_id, pressed)
        return jsonify({'status': 'ok'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
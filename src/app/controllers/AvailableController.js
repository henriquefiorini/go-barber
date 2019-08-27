import { Op } from 'sequelize';
import {
  format,
  startOfDay,
  endOfDay,
  setSeconds,
  setMinutes,
  setHours,
  isAfter,
} from 'date-fns';

import Appointment from '../models/Appointment';

class AvailableController {
  async list(req, res) {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        error: 'Invalid request.',
      });
    }

    const targetDate = Number(date);
    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.params.providerId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(targetDate), endOfDay(targetDate)],
        },
      },
    });

    const schedule = [
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ];

    const availableSchedule = schedule.map(time => {
      const [hour, minute] = time.split(':');
      const value = setSeconds(
        setMinutes(setHours(targetDate, hour), minute),
        0
      );
      return {
        time,
        value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        available:
          isAfter(value, new Date()) &&
          !appointments.find(a => format(a.date, 'HH:mm') === time),
      };
    });

    return res.json(availableSchedule);
  }
}

export default new AvailableController();

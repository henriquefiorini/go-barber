import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';

import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';

class AppointmentController {
  async list(req, res) {
    const appointments = await Appointment.findAll({
      where: {
        user_id: req.currentUserId,
        canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async create(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({
        error: 'Invalid request.',
      });
    }

    const { provider_id, date } = req.body;

    // Validate "provider_id" as a provider
    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });
    if (!isProvider) {
      return res.status(401).json({
        error: 'Must create appointments with provider profiles only.',
      });
    }

    // Validate if "date" is not in the past
    const startTime = startOfHour(parseISO(date));
    if (isBefore(startTime, new Date())) {
      return res.status(400).json({
        error: 'Mut not inform past dates.',
      });
    }

    // Check provider's availability
    const hasAppointment = await Appointment.findOne({
      where: {
        provider_id,
        date: startTime,
        canceled_at: null,
      },
    });
    if (hasAppointment) {
      return res.status(400).json({
        error: 'Appointment date is not available.',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.currentUserId,
      provider_id,
      date,
    });
    return res.json(appointment);
  }
}

export default new AppointmentController();

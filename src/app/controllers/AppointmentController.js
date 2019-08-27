import * as Yup from 'yup';
import { parseISO, format, startOfHour, isBefore, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async list(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        user_id: req.currentUserId,
        canceled_at: null,
      },
      attributes: ['id', 'date', 'past', 'cancelable'],
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
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

    // Get current user
    const user = await User.findByPk(req.currentUserId);
    if (!user) {
      return res.status(401).json({
        error: 'You must be logged in to view this resource.',
      });
    }

    // Validate if user is not creating an appointment with itself
    if (req.currentUserId === provider_id) {
      return res.status(400).json({
        error: 'You cannot create an appointment with yourself.',
      });
    }

    // Validate "provider_id" as a provider
    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });
    if (!isProvider) {
      return res.status(401).json({
        error: 'You must create appointments with provider profiles only.',
      });
    }

    // Validate if "date" is not in the past
    const startTime = startOfHour(parseISO(date));
    if (isBefore(startTime, new Date())) {
      return res.status(400).json({
        error: 'You must not inform past dates.',
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

    // Create appointment
    const appointment = await Appointment.create({
      user_id: req.currentUserId,
      provider_id,
      date,
    });

    // Notify provider
    const formattedDate = format(
      startTime,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );
    await Notification.create({
      content: `Novo agendamento de ${user.name} no ${formattedDate}`,
      user: provider_id,
    });
    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    // Users can only cancel their own appointments
    if (req.currentUserId !== appointment.user_id) {
      return res.status(401).json({
        error: 'You are not allowed to cancel this appointment.',
      });
    }

    // Cancellations must be made 2 hours before the appointment, at least
    const maxCancellationDate = subHours(appointment.date, 2);
    if (isBefore(maxCancellationDate, new Date())) {
      return res.status(400).json({
        error: 'You must only cancel appointments 2 hours in advance.',
      });
    }

    // Update appointment
    appointment.canceled_at = new Date();
    await appointment.save();

    // Send email notification
    await Queue.add(CancellationMail.key, { appointment });

    return res.json(appointment);
  }
}

export default new AppointmentController();

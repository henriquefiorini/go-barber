import * as Yup from 'yup';

import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
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

    // Validate provider_id as a provider
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

    const appointment = await Appointment.create({
      user_id: req.currentUserId,
      provider_id,
      date,
    });
    return res.json(appointment);
  }
}

export default new AppointmentController();

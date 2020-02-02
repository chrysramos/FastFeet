import * as Yup from 'yup';
import { getHours, parseISO } from 'date-fns';
import { Op } from 'sequelize';

import Order from '../models/Order';
import File from '../models/File';
import Deliveryman from '../models/Deliveryman';
import Recipient from '../models/Recipient';

class DeliveryController {
  async index(req, res) {
    const deliverymanId = req.params.id;

    const orders = await Order.findAll({
      where: {
        deliveryman_id: deliverymanId,
        canceled_at: null,
      },
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'street',
            'number',
            'complement',
            'state',
            'city',
            'cep',
          ],
        },
        {
          model: Deliveryman,
          as: 'deliveryman',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    if (req.query.delivered === 'true') {
      const ordersDelivered = orders.filter(order => order.end_date !== null);
      return res.json(ordersDelivered);
    }

    return res.json(orders);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.date(),
      end_date: Yup.date(),
      signature_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { deliverymanId, orderId } = req.params;
    const { start_date, end_date, signature_id } = req.body;

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(400).json({
        message: 'Order not found!',
      });
    }

    if (order.deliveryman_id !== Number(deliverymanId)) {
      return res.status(400).json({
        message: 'Deliveryman do not have permission to access this order',
      });
    }

    if (start_date && end_date) {
      return res.status(400).json({
        message: 'You cannot perform two operations at the same time',
      });
    }

    if (!start_date && !end_date) {
      return res.status(400).json({
        message: 'No operations detected',
      });
    }

    if (start_date) {
      const hours = getHours(parseISO(start_date));

      if (hours < 8 || hours > 18) {
        return res.status(400).json({
          message: 'Out of delivery hours',
        });
      }

      const ordersDelivered = await Order.findAll({
        where: {
          deliveryman_id: deliverymanId,
          end_date: {
            [Op.ne]: null,
          },
        },
      });

      if (ordersDelivered.length >= 5) {
        return res.status(400).json({
          message: 'You have exceeded the daily limit of 5 orders',
        });
      }

      order.start_date = start_date;
      await order.save();
    }

    if (end_date) {
      if (!signature_id) {
        return res.status(400).json({
          message: 'Signature is required',
        });
      }

      if (!order.start_date) {
        return res.status(400).json({
          message: 'The product has not yet been collected for delivery',
        });
      }

      order.end_date = end_date;
      order.signature_id = Number(signature_id);
      await order.save();
    }

    return res.json(order);
  }
}

export default new DeliveryController();
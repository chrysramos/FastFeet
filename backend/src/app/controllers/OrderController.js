import * as Yup from 'yup';
// import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
// import pt from 'date-fns/locale/pt';
import Order from '../models/Order';
import File from '../models/File';
import Deliveryman from '../models/Deliveryman';
import Recipient from '../models/Recipient';

import NewOrderMail from '../jobs/NewOrderMail';
import Queue from '../../lib/Queue';

class OrderController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const orders = await Order.findAll({
      attributes: ['id', 'product', 'canceled_at', 'start_date', 'end_date'],
      limit: 20,
      offset: (page - 1) * 20,
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

    return res.json(orders);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      recipient_id: Yup.number().required(),
      deliveryman_id: Yup.number().required(),
      signatureId: Yup.number(),
      product: Yup.string().required(),
      canceled_at: Yup.date(),
      start_date: Yup.date(),
      end_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const deliverymanExists = await Deliveryman.findByPk(
      req.body.deliveryman_id
    );

    if (!deliverymanExists) {
      return res.status(400).json({
        message: 'Deliveryman not found!',
      });
    }

    const recipientExists = await Recipient.findByPk(req.body.recipient_id);

    if (!recipientExists) {
      return res.status(400).json({
        message: 'Recipient not found!',
      });
    }

    const signatureId = req.body.signature_id;

    if (signatureId) {
      const signatureExists = await File.findByPk(signatureId);

      if (!signatureExists) {
        return res.status(400).json({
          message: 'Signature not found!',
        });
      }
    }

    const order = await Order.create(req.body);

    await Queue.add(NewOrderMail.key, {
      deliveryman: deliverymanExists,
      product: order.product,
    });

    return res.status(201).json(order);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      recipient_id: Yup.number(),
      deliveryman_id: Yup.number(),
      signatureId: Yup.number(),
      product: Yup.string(),
      canceled_at: Yup.date(),
      start_date: Yup.date(),
      end_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    let deliverymanChanged = false;
    const orderId = req.params.id;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(400).json({
        message: 'Order not found!',
      });
    }

    const deliverymanId = req.body.deliveryman_id;

    if (deliverymanId && deliverymanId !== order.deliveryman_id) {
      const deliverymanExists = await Deliveryman.findByPk(deliverymanId);

      if (!deliverymanExists) {
        return res.status(400).json({
          message: 'Deliveryman not found!',
        });
      }

      deliverymanChanged = true;
    }

    const recipientId = req.body.recipient_id;

    if (recipientId && recipientId !== order.recipient_id) {
      const recipientExists = await Recipient.findByPk(req.body.recipient_id);

      if (!recipientExists) {
        return res.status(400).json({
          message: 'Recipient not found!',
        });
      }
    }

    const signatureId = req.body.signature_id;

    if (signatureId && signatureId !== order.signature_id) {
      const signatureExists = await File.findByPk(signatureId);

      if (!signatureExists) {
        return res.status(400).json({
          message: 'Signature not found!',
        });
      }
    }

    await order.update(req.body);

    if (deliverymanChanged) {
      const deliveryman = await Deliveryman.findByPk(deliverymanId);

      await Queue.add(NewOrderMail.key, {
        deliveryman,
        product: order.product,
      });
    }

    return res.json(order);
  }

  async delete(req, res) {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(400).json({
        message: 'Order not found ',
      });
    }

    await order.destroy();

    return res.status(204).json();
  }
}

export default new OrderController();
import {Basket, Order, Product, User} from "../models/models.js";
import _ from "lodash";
import {calculateTotalPrice} from "../handlers/handleUser.js";
import {DATA_PAYMENT_BACK, DATA_PAYMENTS} from "../utils/buttons/paymentButtons.js";
import {DATA_BONUS_CANCEL, DATA_BONUS_CONFIRM} from "../utils/buttons/userButtons.js";

const UserService = {

    async Products(req, res) {
        return res.status(200).json(await Product.findAll({raw: true, order: [['id', 'DESC']]}))
    },

    async Basket(req, res) {
        const {user_id} = req.body

        const basket = await Basket.findAll({
            raw: true,
            where: {
                user_id
            }
        })

        return res.status(200).json(basket)
    },

    async WebData(req, res, bot) {

        try {
            const {queryId, basket, totalPrice, userId} = req.body

            let order = await Order.findOrCreate({
                where: {
                    user_id: _.toInteger(userId),
                    isPayment: 0,
                },
                raw: true
            })

            order = _.first(order).dataValues ?? _.first(order)


            let user = await User.findOne({
                raw: true,
                where: {
                    user_id: _.toInteger(userId),
                }
            })

            await Basket.destroy({
                where: {user_id: _.toInteger(userId)}
            })

            const newBasket = []

            basket?.map(async (product) => {

                newBasket.push({
                    product_id: _.toInteger(product?.product_id),
                    count: _.toInteger(product?.count),
                    order_id: _.toInteger(order?.id),
                    user_id: _.toInteger(userId)
                })

            })

            await Basket.bulkCreate(newBasket)

            const calculate = await calculateTotalPrice(user)

            if (calculate?.totalPrice > 100 && _.toInteger(user?.bonus) === 0 || calculate?.totalPrice <= 100) {
                await bot.telegram.answerWebAppQuery(queryId, {
                    type: 'article',
                    id: queryId,
                    title: 'title',
                    input_message_content: {
                        message_text: `<b>???? ?????????????? ?????????????????? ????????????</b>\n\n${calculate?.basketToString}<b>???? ?????????? ?? ???????????? ?? ???????????? ?????????????????? ?????????????? ?? ??????????: </b>${calculate?.totalPrice} ??????. <b>\n\n???????????? ????????????:</b> ????????????\n\n???????? ?????? ??????????, ?????????????? "???? ?????????????? ?? ????????????", ???????? ???????????? ???????????? ?????????????????? ?? ???????? ??????????, ?????????????? "???? ??????????"`,
                        parse_mode: 'HTML',
                    },
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: '???? ?????????????? ?? ????????????', callback_data: DATA_PAYMENTS},
                            ],
                            [
                                {text: '???? ??????????', callback_data: DATA_PAYMENT_BACK},
                            ],
                        ]
                    }
                })
            } else {
                user = await User.findOne({
                    raw: true,
                    where: {
                        user_id: _.toInteger(userId),
                    }
                })
                await bot.telegram.sendMessage(userId, `?????????????? ???? ???? ?????????????? ?????????????????? ?????????????\n\n1 ?????????? = 1 ??????.\n\n???? ???????????? ?????????????? ?????????? ?????? ???????????? ?????? ???????????? ??????????, ?? ???????????????? ???????????? ???? ???????????? ?????????????? ?? ?????????????????????????????? ??????????????.\n\n?????????? ??????????????: ${user?.bonus} ??????.\n\n?????????? ?? ????????????: ${calculate?.totalPrice} ??????.`, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: '????', callback_data: DATA_BONUS_CONFIRM},
                                {text: '??????', callback_data: DATA_BONUS_CANCEL},
                            ],
                            [
                                {text: '???? ??????????', callback_data: DATA_PAYMENT_BACK},
                            ],
                        ]
                    }
                })
                // await bot.telegram.answerWebAppQuery(queryId, {
                //     type: 'article',
                //     id: queryId,
                //     title: 'title',
                //     input_message_content: {
                //         message_text: `?????? ?????????? ????????????`,
                //         parse_mode: 'HTML',
                //     }
                // })
            }
            return res.status(200).json({})
        } catch (e) {
            console.log(e)
            return res.status(400).json({})
        }

    }

}

export default UserService

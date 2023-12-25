const { axios } = MuonAppUtils

module.exports = {
  APP_NAME: 'simple_oracle',

  onRequest: async function(request){
    let {
      method,
      data: { params }
    } = request;
    switch (method) {
      case 'price':
        let { token, unit } = params
        var response = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=${token}`)
        var price = parseInt(response.data.data.rates[unit])
        return { price }

      default:
        throw `Unknown method ${method}`
    }
  },

  signParams: function(request, result){
    let {
      method,
      data: { params }
    } = request
    let { price } = result;
    let { token, unit } = params

    switch (method) {
      case 'price':
        const gatewayPrice = request.data?.result?.price || price;
        if (100 * Math.abs(price - gatewayPrice) / price > 0.5) {
          throw 'invalid price'
        }
        return [
          { type: 'uint32', value: gatewayPrice },
          { type: 'string', value: token },
          { type: 'string', value: unit },
        ]
      default:
        throw `Unknown method '${method}'`
    }
  }
}
/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const ip = require('ip');
const StockModel = require('../models/StockModel.js');
const CONNECTION_STRING = process.env.DATABASE; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

// Connect to the database
mongoose.connect(process.env.DATABASE, {useNewUrlParser: true});
mongoose.set('useFindAndModify', false);

// https://iexcloud.io/docs/api/#introduction
let apiURL = 'https://cloud.iexapis.com/stable/stock/';
let apiKey = process.env.API_PUBLISHABLE_KEY;

module.exports = function (app) {

app.route('/api/stock-prices')
.get((req, res) => {
  let ipAddress = ip.address();
  let stockData = req.query.stock;
  let likesData = req.query.like;
  let ipFound, stock1, stock2, firstStockLikes, secondStockLikes, builtUrl1, builtUrl2;
  let ipAddressArray = [];
  
  if(stockData.length == 0) {
    // Report the error
     return res.json.send('No stock symbol provided or invaild stock symbol.');
  } else if(typeof stockData == 'string') {
    stock1 = stockData;
  } else {
    stock1 = stockData[0];
    stock2 = stockData[1];
  }
  
  if(stock1 != null && stock2 == null) {
    // See if stock already exists in database
    StockModel.findOne({symbol: stock1}, (error, stock) => {
      if(error) {
        res.send('Error occurred');
        return;
      }

      if(stock == null) { // If no stock was found in the database, add it
        let stockToAdd;
        if(likesData != null) {
          firstStockLikes = 1;
          stockToAdd = new StockModel({
            symbol: stock1,
            likes: firstStockLikes,
            ipAddresses: ipAddress
          })
          stockToAdd.save();
        } else {
          firstStockLikes = 0;
          stockToAdd = new StockModel({
            symbol: stock1,
            likes: firstStockLikes
          })
          stockToAdd.save();
        }
      } else { // Stock was found in the database
        ipAddressArray = stock.ipAddresses; // Put the ip addresses from the document into an array
        firstStockLikes = stock.likes;
        ipFound = ipAddressArray.includes(ipAddress); // See if the users ip is in the array. This is true or false.
        if(likesData === 'true' && ipFound === false) {
          // Add the new like
          StockModel.findOneAndUpdate({symbol: stock1}, {$inc : {'likes': 1}, $push: {ipAddresses: ipAddress}}, (error, updated) => {
          })
        }
      }
    });
    // Make the single fetch call
    builtUrl1 = apiURL + stock1 + '/quote?token=' + apiKey;
    fetch(builtUrl1)
      .then(res => res.json())
      .then(data => {
      res.json({stockData: {stock: stock1, price: data.latestPrice.toString(), likes: firstStockLikes}})
      });
  } else { // Two stocks are passed in
    Promise.all([
      StockModel.find({symbol: stock1}),
      StockModel.find({symbol: stock2})
      ])
      .then(([One, Two]) => {
        if(One.length == 0) { // Add new stock
          if(likesData != null) {
            firstStockLikes = 1;
            let stockToAdd1 = new StockModel({
              symbol: stock1,
              likes: firstStockLikes,
              ipAddresses: ipAddress
            })
            stockToAdd1.save();
          } else {  // Need to save even if like is not sent and if the stock is new
            firstStockLikes = 0;
            let stockToAdd1 = new StockModel({
              symbol: stock1,
              likes: firstStockLikes
            })
            stockToAdd1.save();
          }
        } else {
          firstStockLikes = One[0].likes;
        }
        if(Two.length == 0) { // Add new stock
          if(likesData != null) {
            secondStockLikes = 1;
            let stockToAdd2 = new StockModel({
              symbol: stock2,
              likes: secondStockLikes,
              ipAddresses: ipAddress
            })
            stockToAdd2.save();
          } else { // Need to save even if like is not sent and if the stock is new
            secondStockLikes = 0;
            let stockToAdd2 = new StockModel({
              symbol: stock2,
              likes: secondStockLikes
            })
            stockToAdd2.save();
          }
        } else {
          secondStockLikes = Two[0].likes;
        }
      // Make the two api calls
      builtUrl1 = apiURL + stock1 + '/quote?token=' + apiKey;
      builtUrl2 = apiURL + stock2 + '/quote?token=' + apiKey;    
      let urls = [builtUrl1, builtUrl2];

      Promise.all(urls.map(url =>
        fetch(url)
          .then(res => res.json())
          .catch(error => console.log(error))))
          .then(data => {
            let firstStock = data[0];
            let secondStock = data[1];
            res.json({stockData: [
              {stock: stock1, price: firstStock.latestPrice.toString(), rel_likes: firstStockLikes - secondStockLikes},
              {stock: stock2, price: secondStock.latestPrice.toString(), rel_likes: secondStockLikes - firstStockLikes}
            ]})
      })
    })
  }
}); 
};

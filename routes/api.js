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
var request = require('request');

const CONNECTION_STRING = process.env.MONGO_URI; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

//stock api
//https://cloud.iexapis.com/stable/stock/goog/quote?token=pk_1263ee4e114c4040bf390ced617f9ba3

module.exports = function (app) {
 function getStock (stockTicker, callback) {
          request.get('https://cloud.iexapis.com/stable/stock/'+stockTicker+'/quote?token=pk_1263ee4e114c4040bf390ced617f9ba3', function(err, response, body) {
            if (err) {
              callback('stockTicker error');
            } else if (response.statusCode == 200) {
              var stock = JSON.parse(body);
              callback(stock);
            } else {
              callback('stockTicker error');
            }
        })
      };
  
  app.route('/api/stock-prices')
    .get(function (req, res){
      // console.log(req.headers["host"].substring(0,9));
      let firstStock;
      let firstPrice;
      let firstLikes;
      let IP;
       
       if (req.headers["host"].substring(0,9) == '127.0.0.1') {
         IP = req.headers["host"].substring(0,9);
       } else {
        IP = req.headers["x-forwarded-for"].split(',')[0];
       }
      let stockTicker;
      if (req.query.stock.length == 2) {
        stockTicker = req.query.stock;
      } else {
        stockTicker = [req.query.stock];
      }   
      // console.log(req.query, stockTicker)
       
      let addLike = req.query.like || false;
      //console.log(addLike, req.query.like)
        let i = 0;
      //stockTicker.forEach((stockChild)=> {
        for (let j = 0; j < stockTicker.length; j++) {
       getStock(stockTicker[j], (data) => {
         // console.log(j,'right after get stock', stockTicker[j]);
         // console.log('data',data.symbol)
         
         if (data == 'stockTicker error') {
           
         } else {
           MongoClient.connect(CONNECTION_STRING, function(err, db) {
             console.log('inside DB', data.symbol)
              db.db('stock').collection('stocks')
                  .findOne({stock: data.symbol}, (err, data1) =>{
            if (err) {
                res.json({error : 'error'})
            } else if(data1) {
               // console.log('found data', data1)
                if (addLike && !data1.ipAddresses.includes(IP)) {
                  data1.likes = data1.likes+1;
                  data1.ipAddresses.push(IP)
                }              
                  db.db('stock').collection('stocks').save(data1).then(update => {
                   // console.log('inside update', stockTicker[i]);
                    if (stockTicker.length > 1){
                      if (i == 0) {
                        firstStock = data.symbol;
                        firstPrice = data.latestPrice;
                        firstLikes = data1.likes;
                        // console.log(firstStock,firstPrice,firstLikes);
                        i++;
                      } else {
                        let firstDiff = firstLikes-data1.likes;
                        let secondDiff = data1.likes-firstLikes;
                        // console.log({"stockData":[{"stock":firstStock,"price":firstPrice,"rel_likes":firstDiff},{"stock":data.symbol,"price":data.latestPrice,"rel_likes":secondDiff}]});
                      res.send({"stockData":[{"stock":firstStock,"price":firstPrice,"rel_likes":firstDiff},{"stock":data.symbol,"price":data.latestPrice,"rel_likes":secondDiff}]})      
                      }
                    } else {
                      res.send({"stockData":{"stock":data.symbol, "price":data.latestPrice, "likes":data1.likes}});                      
                    }

                  }).catch(error => {
                    // console.log('could not save')
                    res.send('could not update ' + req.body._id)
                  })

            } else {
              var likes = 0;
              var ipAddresses = [];
              if (addLike) {
                likes = 1;
                ipAddresses.push(IP);
              }
                    db.db('stock').collection('stocks')
                      .insertOne({stock: data.symbol,
                                  likes: likes,
                                  ipAddresses: ipAddresses}, (err,doc) => {
                      if (err) {
                        console.log(err);
                      } else{
                         // console.log(doc.ops[0])
                        if (stockTicker.length > 1){
                          if (i == 0) {
                            firstStock = data.symbol;
                            firstPrice = data.latestPrice;
                            firstLikes = doc.ops[0].likes;
                            // console.log(firstStock,firstPrice,firstLikes); 
                            i++;
                          } else {
                            let firstDiff = firstLikes-doc.ops[0].likes;
                            let secondDiff = doc.ops[0].likes-firstLikes;
                            // console.log({"stockData":[{"stock":firstStock,"price":firstPrice,"rel_likes":firstDiff},{"stock":data.symbol,"price":data.latestPrice,"rel_likes":secondDiff}]});
                            res.send({"stockData":[{"stock":firstStock,"price":firstPrice,"rel_likes":firstDiff},{"stock":data.symbol,"price":data.latestPrice,"rel_likes":secondDiff}]})                               
                          }

                        } else {
                          res.send({"stockData":{"stock":data.symbol, "price":data.latestPrice, "likes":doc.ops[0].likes}});
                        }
                      }
                    })
            }
        }) // end findOne
       }); // end database connect    
      }}) //end of getStock
     } //end of for loop
    }); //end of .get
    
};

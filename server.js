

require ('dotenv').config()
const session=require('express-session')
const express=require('express')
const app=express()
const paypal=require('@paypal/checkout-server-sdk')
const Environment=process.env.NODE_ENV=== 'production'?
paypal.core.LiveEnvironment:paypal.core.SandboxEnvironment;
var data=[]
var total;
const paypalClient=new paypal.core.PayPalHttpClient(
    new Environment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET))
const storeItems=new Map([ [1,{name:'CSKA_FC-cap',price:22}], [2,{name:'Slavia_FC-cap',price:13}],  [3,{name:'Beroe_FC-cap',price:12}]  ])
var selectedItems=[]
app.set('view engine','ejs');
app.use(express.static('public'))
app.use(express.json())
app.use(session({  secret:process.env.PAYPAL_CLIENT_SECRET, resave:false,saveUninitialized:true}))

app.get('/',(req,res)=>{
    res.render('index',{paypalClientId:process.env.PAYPAL_CLIENT_ID,cartData:data })
})

app.get('/:params',(req,res)=>{
    res.render(req.url.split('/')[1],{paypalClientId:process.env.PAYPAL_CLIENT_ID,cartData:data,storeItems:storeItems})
}) 
app.get('/images/:params',(req,res)=>{
    const image=req.url.split('/images/')[1]
    res.sendFile(`${__dirname}/public/images/${image}`)
})
app.post('/addToCart',(req,res)=>{ 
selectedItems.push(req.body.items[0])
req.session.shoppingData=selectedItems
data=req.session.shoppingData
 /**/ console.log(data)
res.redirect('/') })
app.post('/create-order',async (req,res)=>{
const request=new paypal.orders.OrdersCreateRequest()
const selectedItems=req.session.shoppingData||[];

 total=data.reduce((sum,item)=>{   
return sum +  storeItems.get(Number(item.id)).price * item.quantity},0)
request.prefer("return=representation");
request.requestBody({
    intent:'CAPTURE',
    purchase_units:[
        {
         amount:{
            currency_code:'USD',
            value:total,
            breakdown:{
                item_total:{
                    currency_code:'USD',
                    value:total
                }  }  } ,
           items:selectedItems.map(item=>{
            const storeItem=storeItems.get(item.id)
            return {
                name:storeItem.name,
                unit_amount:{
                    currency_code:'USD',
                    value:storeItem.price  } ,
            quantity:item.quantity }  })
        }
    ]

})
try {
    const order=await paypalClient.execute(request)
    res.json({id:order.result.id})
    data.length=0;
    console.log(data)

    
} catch (e) {
    res.status(500).json({error:e.message})
    
}
})

app.listen(3000,console.log('server started on port 3000'))

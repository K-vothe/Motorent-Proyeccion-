import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
    definition:{
        openapi: "3.0.0",
        info: {
            title: "MOTORENT API",
            version:"1.0.0",
            description:"API rest de motorent"
        },
    
    servers:[
        {
            url:"http://localhost:3000",
            description:"Servidor backend motorent"
            },
        ],

        components: {
      securitySchemes: {
        autenticacionJWT: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

},


    apis:["./src/routes/*.ts"]
}

export const swaggerSpec = swaggerJSDoc(options);

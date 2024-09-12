# Vector Searching

This is a test project ot test vector search functionality of MongoDB with OpenAI API for embedding.

## To start project

### Atlas

Create a Cluster free tier should be sufficient.

Create database named `sample_mflix` with collection `movies`.

Go to *Triggers* service in *Services* and create one with such specs:

- Trigger Type: Database
...
- Cluster Name: <your cluster> [`Cluster0` by default]
- Database Name: sample_mflix
- Collection Name: movies
- Operation Type: insert, update, replace
- Full Document: true/selected
...
- Select An Event Type: Function
    Code:

```js
exports = async function(changeEvent) {
    // Get the full document from the change event.
    const doc = changeEvent.fullDocument;

    // Define the OpenAI API url and key.
    const url = 'https://api.openai.com/v1/embeddings';
    // Use the name you gave the value of your API key in the "Values" utility inside of App Services
    const openai_key = context.values.get("openai_value");
    try {
        console.log(`Processing document with id: ${doc._id}`);

        // Call OpenAI API to get the embeddings.
        let response = await context.http.post({
            url: url,
             headers: {
                'Authorization': [`Bearer ${openai_key}`],
                'Content-Type': ['application/json']
            },
            body: JSON.stringify({
                // The field inside your document that contains the data to embed, here it is the "plot" field from the sample movie data.
                input: doc.plot,
                model: "text-embedding-ada-002"
            })
        });

        // Parse the JSON response
        let responseData = EJSON.parse(response.body.text());

        // Check the response status.
        if(response.statusCode === 200) {
            console.log("Successfully received embedding.");

            const embedding = responseData.data[0].embedding;

            // Use the name of your MongoDB Atlas Cluster
            const collection = context.services.get("Cluster0").db("sample_mflix").collection("movies");

            // Update the document in MongoDB.
            const result = await collection.updateOne(
                { _id: doc._id },
                // The name of the new field you'd like to contain your embeddings.
                { $set: { plot_embedding: embedding }}
            );

            if(result.modifiedCount === 1) {
                console.log("Successfully updated the document.");
            } else {
                console.log("Failed to update the document.");
            }
        } else {
            console.log(`Failed to receive embedding. Status code: ${response.statusCode}`);
        }

    } catch(err) {
        console.error(err);
    }
};
```

Navigate to App Services->Values and create `openai_key` of type `*secret*` and `openai_value` of type `*value*` and content linked to secret `openai_key`.

#### Atlas Search

Go to Database -> Cluster -> Atlas Search

Create search index `Atlas Vector Search`/`JSON Editor`.

On Database and collection tab choose `sample_mflix/movies`.
Name it `vector_index` with such code:

```json
{
  "fields": [{
    "path": "plot_embedding",
    "numDimensions": 1536,
    "similarity": "cosine",
    "type": "vector"
  }]
}
```

Save It.

Go to cluster click 3 dots near browse collection. Select Load Sample Dataset.

### Code

Copy `.env.example` to `.env` and replace api key string for open ai and mongo connection string.

Run:

```bash
npm i
npm start
```

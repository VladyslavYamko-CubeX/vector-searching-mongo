const axios = require('axios');
const { json } = require('stream/consumers');
const MongoClient = require('mongodb').MongoClient;

async function getEmbedding(query) {
	// Define the OpenAI API url and key.
	const url = 'https://api.openai.com/v1/embeddings';
	const openai_key = process.env.OPENAI_KEY; // Replace with your OpenAI key.

	// Call OpenAI API to get the embeddings.
	let response = await axios.post(
		url,
		{
			input: query,
			model: 'text-embedding-ada-002',
		},
		{
			headers: {
				Authorization: `Bearer ${openai_key}`,
				'Content-Type': 'application/json',
			},
		}
	);

	if (response.status === 200) {
		return response.data.data[0].embedding;
	} else {
		throw new Error(
			`Failed to get embedding. Status code: ${response.status}`
		);
	}
}

async function findSimilarDocuments(embedding) {
	const url = process.env.MONGODB_URI; // Replace with your MongoDB url.
	const client = new MongoClient(url);

	try {
		await client.connect();

		const db = client.db('sample_mflix'); // Replace with your database name.
		const collection = db.collection('movies'); // Replace with your collection name.

		// Query for similar documents.
		const documents = await collection
			.aggregate([
				{
					$vectorSearch: {
						queryVector: embedding,
						path: 'plot_embedding', //embedding field
						numCandidates: 100,
						limit: 5,
						index: 'vector_index', // Name of vector search index in Atlas Search
					},
				},
				{
					$project: {
						_id: 0,
						title: 1,
						plot: 1,
					},
				},
			])
			.toArray();

		return documents;
	} finally {
		await client.close();
	}
}

async function main() {
	const query = 'a boy with a yellow dog'; // Replace with your query.

	try {
		const embedding = await getEmbedding(query);
		const documents = await findSimilarDocuments(embedding);

		console.log(documents);
	} catch (err) {
		console.error(err);
	}
}

main();

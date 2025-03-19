/**
 * Lambda function responsible for triggering revalidation of Next.js pages
 * This function is called when content changes to update static pages
 */

const https = require('https');

exports.handler = async (event) => {
  try {
    console.log('Revalidation event received:', JSON.stringify(event));
    
    // Get the revalidation path from the event
    let paths = [];
    
    if (event.Records) {
      // Handle S3 event or SNS/SQS triggers
      for (const record of event.Records) {
        if (record.s3) {
          // Extract path from S3 key
          const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
          paths.push(`/${key}`);
        } else if (record.body) {
          // Handle SNS/SQS message
          try {
            const body = JSON.parse(record.body);
            if (body.path) {
              paths.push(body.path);
            }
          } catch (e) {
            console.error('Error parsing message body:', e);
          }
        }
      }
    } else if (event.path) {
      // Direct invocation with path
      paths.push(event.path);
    } else if (event.paths && Array.isArray(event.paths)) {
      // Batch revalidation
      paths = event.paths;
    }
    
    if (paths.length === 0) {
      console.log('No paths to revalidate');
      return { statusCode: 200, body: 'No paths to revalidate' };
    }
    
    // Get the target domain from environment variables
    const revalidationDomain = process.env.REVALIDATION_DOMAIN;
    const revalidationSecret = process.env.REVALIDATION_SECRET;
    
    if (!revalidationDomain) {
      throw new Error('REVALIDATION_DOMAIN environment variable is not set');
    }
    
    if (!revalidationSecret) {
      throw new Error('REVALIDATION_SECRET environment variable is not set');
    }
    
    // Process each path
    const results = await Promise.all(paths.map(async (path) => {
      const options = {
        hostname: revalidationDomain,
        path: '/api/revalidate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const postData = JSON.stringify({
        secret: revalidationSecret,
        path: path
      });
      
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log(`Revalidation result for ${path}: ${res.statusCode} ${data}`);
            resolve({
              path,
              statusCode: res.statusCode,
              response: data
            });
          });
        });
        
        req.on('error', (error) => {
          console.error(`Error revalidating ${path}:`, error);
          reject(error);
        });
        
        req.write(postData);
        req.end();
      });
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Revalidation triggered',
        results
      })
    };
  } catch (error) {
    console.error('Error in revalidation lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error triggering revalidation',
        error: error.message
      })
    };
  }
};
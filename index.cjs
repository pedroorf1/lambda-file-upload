const Multipart = require("lambda-multipart");
// const AWS = require("aws-sdk");
// import Multipart from "lambda-multipart";
//import AWS from "aws-sdk";
// import * as AWS from "@aws-sdk/client-s3"
const AWS = require("@aws-sdk/client-s3")
// import { v4 as uuidv4 } from 'uuid'
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3Client();
const PutObjectCommand = AWS.PutObjectCommand;

module.exports.handler = async (event, context) => {
  const { fields, files } = await parseMultipartFormData(event);

  if (files == null || files.length == 0) {
    // no file found in http request
    return {
      statusCode: 200
    };
  }

  await Promise.all(
    files.map(async file => {
      await uploadFileIntoS3(file);
    })
  );

  return {
    statusCode: 201
  };
};

const parseMultipartFormData = async event => {
  return new Promise((resolve, reject) => {
    const parser = new Multipart(event);

    parser.on("finish", result => {
      resolve({ fields: result.fields, files: result.files });
    });

    parser.on("error", error => {
      return reject(error);
    });
  });
};

const uploadFileIntoS3 = async file => {
  console.log("\nEnvs: ", process.env)
  const ext = getFileExtension(file);
  const options = {
    Bucket: process.env.file_s3_bucket_name,
    Key: `${uuidv4()}.${ext}`,
    Body: file
  };
  const fileName = options.Key
  try {
    await s3.send(new PutObjectCommand(options));
    console.log(
      `File uploaded into S3 bucket: "${process.env.file_s3_bucket_name
      }", with key: "${fileName}"`
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getFileExtension = file => {
  const headers = file["headers"];
  if (headers == null) {
    throw new Error(`Missing "headers" from request`);
  }

  if (!!headers["content-type"]) {
    const contentType = headers["content-type"];

    if (contentType == "image/jpeg") {
      return "jpg";
    }
    if (contentType == "image/png") {
      return "png";
    }
    if (contentType == "video/mp4") {
      return "mp4";
    }
    if (contentType == "application/x-mpegURL") {
      return "m3u8";
    }
    throw new Error(`Unsupported content type "${contentType}".`);
  } else {
    throw new Error(`No content type found in headers: "${JSON.stringify(headers)}"`);
  }

};


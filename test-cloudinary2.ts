import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
async function test() {
  try {
    const res = await cloudinary.api.resources({ resource_type: "video", max_results: 1 });
    if(res.resources.length > 0) {
      console.log("public id:", res.resources[0].public_id);
      const details = await cloudinary.api.resource(res.resources[0].public_id, { resource_type: "video", image_metadata: true, media_metadata: true });
      console.log(JSON.stringify(details, null, 2));
    }
  } catch (err) {
    console.log(err);
  }
}
test();

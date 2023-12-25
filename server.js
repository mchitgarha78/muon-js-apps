require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { Web3 } = require("web3");
const {
  utils: { soliditySha3 },
} = Web3;

global.MuonAppUtils = require("./muonapp-utils");

const PORT = process.env.SERVER_PORT || 3000;
const router = express();

function moduleIsAvailable(path) {
  try {
    require.resolve(path);
    return true;
  } catch (error) {
    return false;
  }
}

async function runMuonApp(request) {
  const { reqId, app } = request;
  const appPath = `./muon-apps/${app}.js`;
  if (!moduleIsAvailable(appPath)) {
    throw { message: `App not found on the node` };
  }

  const muonApp = require(appPath);
  const response = { success: true };
  response.result = await muonApp.onRequest(request);
  response.signParams = muonApp.signParams(request, response.result);
  const appId = BigInt(soliditySha3(`${app}.js`)).toString(10);
  response.signParams = [
    { name: "appId", type: "uint256", value: appId },
    { name: "reqId", type: "uint256", value: reqId },
    ...response.signParams,
  ];
  response.hash = soliditySha3(...response.signParams);
  return response;
}

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Define routes
router.get("/", (req, res) => {
  res.json({ message: "muon app runner js" });
});

router.use("/v1/", async (req, res) => {
  console.log(req.body);
  try {
    const result = await runMuonApp(req.body);
    if (!result) {
      throw new Error("Running the Moun app failed.");
    }
    return res.json(result);
  } catch (error) {
    return errorHandler(res, error);
  }
});

// Error handler function
const errorHandler = (res, error) => {
  console.error("error: ", error);
  res.status(400).json({
    success: false,
    error,
  });
};

router.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
});

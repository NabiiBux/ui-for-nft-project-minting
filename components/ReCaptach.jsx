import React, { useEffect, useState } from "react";
import moment from "moment";
import { connectWallet, getCurrentWalletConnected } from "../utils/interact.js";
import {
  Center,
  Card,
  CardBody,
  StackDivider,
  Stack,
  useToast,
  Text,
  useDisclosure,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Flex,
  useMediaQuery,
  Progress,
} from "@chakra-ui/react";
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_SITE_KEY;
const contractABI = require("../contract-abi.json");
const contractAddress = "0xF9fC419822320D75a6BABae48721846516232cf7";
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(
  "wss://eth-mainnet.ws.alchemyapi.io/ws/<api-key>"
);
const contract = new web3.eth.Contract(contractABI, contractAddress);

async function show_error_alert(error) {
  let temp_error = error.message.toString();
  console.log(temp_error);
  let error_list = [
    "FREE_MINT_HAVE_NOT_STARTED_YET",
    "NOT_ENOUGH_SUPPLY_TO_MINT_DESIRED_AMOUNT",
    "FREE_LIMIT_REACHED",
    "YOU_HAVE_ALREADY_CLAIMED",
    "SALE_HAS_NOT_STARTED_YET",
    "INVALID_QUANTITY",
    "CANNOT_MINT_THAT_MANY",
    "Sent Amount Not Enough",
    "Max 20 Allowed.",
    "insufficient funds",
    "INVALID_ETH",
  ];

  for (let i = 0; i < error_list.length; i++) {
    if (temp_error.includes(error_list[i])) {
      // set ("Transcation Failed")
      alert(error_list[i]);
    }
  }
}

const mintNFT = async (amount, price) => {
  const { address } = await getCurrentWalletConnected();
  if (address === "") {
    return {
      success: false,
      status: "❗Please make sure wallet connected.",
    };
  } else {
    try {
      console.log("price: " + amount * price);
      const estemated_Gas = await contract.methods.mint(amount).estimateGas({
        from: address,
        value: amount * price,
        maxPriorityFeePerGas: null,
        maxFeePerGas: null,
      });
      console.log(estemated_Gas);
      console.log("Gas: " + estemated_Gas);
      const result = await contract.methods
        .mint(amount)
        .send({
          from: address,
          value: amount * price,
          gas: estemated_Gas,
          maxPriorityFeePerGas: null,
          maxFeePerGas: null,
        })
        .on("confirmation", function () {
          alert("Success");
        })
        .on("error", async function (error, receipt) {
          console.log(error);
        });
    } catch (e) {
      show_error_alert(e);
    }
    return {
      status: "",
    };
  }
};
const mintFreeNFT = async () => {
  const { address } = await getCurrentWalletConnected();
  if (address === "") {
    return {
      success: false,
      status: "❗Please make sure wallet connected.",
    };
  } else {
    try {
      const estemated_Gas = await contract.methods.free_mint().estimateGas({
        from: address,
        maxPriorityFeePerGas: null,
        maxFeePerGas: null,
      });
      console.log(estemated_Gas);
      console.log("Gas: " + estemated_Gas);
      const result = await contract.methods
        .free_mint()
        .send({
          from: address,
          gas: estemated_Gas,
          maxPriorityFeePerGas: null,
          maxFeePerGas: null,
        })
        .on("confirmation", function () {
          alert("Success");
        })
        .on("error", async function (error, receipt) {
          console.log(error);
        });
    } catch (e) {
      show_error_alert(e);
    }
    return {
      status: "",
    };
  }
};

const ReCaptach = () => {
  const difference = +new moment("2023-12-04 05:30").utc() - +new Date();
  const difference1 = +new moment("2023-12-06 05:30").utc() - +new Date();
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [days1, setDays1] = useState(0);
  const [hours1, setHours1] = useState(0);
  const [minutes1, setMinutes1] = useState(0);
  const [seconds1, setSeconds1] = useState(0);

  const [verfied, setVerifed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (difference > 0) {
        setDays(Math.floor(difference / (1000 * 60 * 60 * 24)));
        setHours(Math.floor((difference / (1000 * 60 * 60)) % 24));
        setMinutes(Math.floor((difference / 1000 / 60) % 60));
        setSeconds(Math.floor((difference / 1000) % 60));
      }
      if (difference1 > 0) {
        setDays1(Math.floor(difference1 / (1000 * 60 * 60 * 24)));
        setHours1(Math.floor((difference1 / (1000 * 60 * 60)) % 24));
        setMinutes1(Math.floor((difference1 / 1000 / 60) % 60));
        setSeconds1(Math.floor((difference1 / 1000) % 60));
      }
    }, 1000);

    return () => {
      clearTimeout(id);
    };
  });

  //recaptcha function
  function onChange(value) {
    console.log("Captcha value:", value);
    setVerifed(true);
  }

  let ethWindow = window.ethereum;
  const CONTRACT_ADDRESS = "0x77C9e7733550026AcE28950e973681C0F74191E3";
  const [contract, setContract] = useState(undefined);
  const [ethAddress, setEthAddress] = useState("");
  const [totalSupply, setTotalSupply] = useState(0);
  const [mintAmount, setMintAmount] = useState(1);
  const [latestTx, setlatestTx] = useState("");
  const [nftUrl, setNftUrl] = useState("");
  const [osLink, setOsLink] = useState("");
  const totalNfts = 8888;
  const { isOpen, onOpen, onClose } = useDisclosure();

  // metamask related function

  const connectWallet = async () => {
    let provider = window.ethereum;

    if (typeof provider !== "undefined") {
      // MetaMask is installed

      provider
        .request({ method: "eth_requestAccounts" })
        .then((accounts) => {
          setEthAddress(accounts[0]);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const disconnectWallet = () => {
    setEthAddress("");
    alert("disconnected");
  };

  const loadBlockchain = async () => {
    let provider = window.ethereum;
    const web3 = new Web3(provider);

    const contract = new web3.eth.Contract(
      MintingContract.abi,
      CONTRACT_ADDRESS
    );
    setContract(contract);
  };

  const buyFlys = (number) => {
    if (contract !== undefined && ethAddress !== "") {
      var value = number * 20000000;

      contract.methods
        .buyFlys(number)
        .send({ from: ethAddress, value: value })
        .then((tx) => {
          console.log(tx);
          setlatestTx(tx.transactionHash);
          setOsLink(
            "https://opensea.io/assets/" +
              tx.to +
              "/" +
              tx.events.Transfer.returnValues.tokenId
          );
          console.log(osLink);
          onOpen();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
  const mintGiveawayFlys = (number) => {
    if (contract !== undefined && ethAddress !== "") {
      var value = number * 20000000;

      contract.methods
        .GiveawayFlys(number)
        .send({ from: ethAddress, value: value })
        .then((tx) => {
          console.log(tx);
          setlatestTx(tx.transactionHash);
          setOsLink(
            "https://opensea.io/assets/" +
              tx.to +
              "/" +
              tx.events.Transfer.returnValues.tokenId
          );
          console.log(osLink);
          onOpen();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  return (
    <div className="container,display" style={{ marginTop: 10 }}>
      {/* <ReCAPTCHA
        sitekey="6Ld4vh4pAAAAAFZ6Mw4U_W4yED0KiaUOUlmTDbEv"
        onChange={onChange}
      /> */}
      {/* WL MINT */}
      <div
        style={{
          border: "1px solid white",
          borderRadius: "5px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontWeight: "bold" }}>WL MINT</h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            Ending in:{" "}
            <div style={{ display: "flex", marginLeft: "10px" }}>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {days < 10 ? `0${days}` : days}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {hours < 10 ? `0${hours}` : hours}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {minutes < 10 ? `0${minutes}` : minutes}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {seconds < 10 ? `0${seconds}` : seconds}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px",
          }}
        >
          <p>
            Only users who are Whitelisted can mint!
            <br />5 per wallet 0.01 SOL per NFT
          </p>
          <button
            style={{
              background: "blue",
              borderRadius: "5px",
              padding: "5px 7px",
              color: "white",
            }}
          >
            Mint Now!
          </button>
        </div>
      </div>
      {/* PUBLIC */}
      <div
        style={{
          border: "1px solid white",
          borderRadius: "5px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontWeight: "bold" }}>PUBLIC</h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            Ending in:{" "}
            <div style={{ display: "flex", marginLeft: "10px" }}>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {days1 < 10 ? `0${days1}` : days1}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {hours1 < 10 ? `0${hours1}` : hours1}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {minutes1 < 10 ? `0${minutes1}` : minutes1}
              </div>
              <div
                style={{
                  background: "blue",
                  marginLeft: "7px",
                  padding: "5px",
                  borderRadius: "3px",
                }}
              >
                {seconds1 < 10 ? `0${seconds1}` : seconds1}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "10px",
          }}
        >
          <p>
            Only users who are Whitelisted can mint!
            <br />5 per wallet 0.01 SOL per NFT
          </p>
          <button
            style={{
              background: "blue",
              borderRadius: "5px",
              padding: "5px 7px",
              color: "white",
            }}
          >
            Mint Now!
          </button>
        </div>
      </div>

      {/* <div id="wrapper">
        <div>
          <p>Public Mint:</p>
          <Button
            style={{
              width: '100%',
              border: '1px solid #ccc',
              marginTop: '10px',
            }}
            colorScheme="black"
            size="lg"
            onClick={() => buyFlys(mintAmount)}
          >
            {' '}
            <Text></Text> MINT
          </Button>
        </div>
        <div>
          <p style={{ margin: '10px 0' }}>Allow List Mint:</p>
          <Button
            style={{ width: '100%' }}
            disabled={!verfied}
            colorScheme="black"
            size="lg"
            onClick={() => mintGiveawayFlys(mintAmount)}
          >
            {' '}
            Whitelist Mint
          </Button>
        </div>
      </div> */}
    </div>
  );
};

export default ReCaptach;

/* eslint-disable react/jsx-no-target-blank */
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { connectWallet, getCurrentWalletConnected } from "../utils/interact.js";
import { AiOutlineInstagram, FaSquareXTwitter } from "react-icons/fa6";
import Modal from "react-bootstrap/Modal";
import frame from "../assets/frame.jpeg";
import Form from "react-bootstrap/Form";
import {
  Center,
  Box,
  Head,
  Image,
  Button,
  HStack,
  VStack,
  Heading,
  Flex,
  Link,
  StackDivider,
  Stack,
  useToast,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useMediaQuery,
  Progress,
} from '@chakra-ui/react';

const alchemyKey = process.env.REACT_APP_ALCHEMY_KEY;
const contractABI = require("../contract-abi.json");
const contractAddress = "0xF9fC419822320D75a6BABae48721846516232cf7";
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(alchemyKey);
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
    "INVALID_ETH"

  ]

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
        maxFeePerGas: null
      });
      console.log(estemated_Gas)
      console.log("Gas: " + estemated_Gas)
      const result = await contract.methods.mint(amount).send({
        from: address,
        value: amount * price,
        gas: estemated_Gas,
        maxPriorityFeePerGas: null,
        maxFeePerGas: null
      })
        .on("confirmation", function () {
          alert("Success")
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
        maxFeePerGas: null
      });
      console.log(estemated_Gas)
      console.log("Gas: " + estemated_Gas)
      const result = await contract.methods.free_mint().send({
        from: address,
        gas: estemated_Gas,
        maxPriorityFeePerGas: null,
        maxFeePerGas: null
      })
        .on("confirmation", function () {
          alert("Success")
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

const Mint = () => {
  const [walletAddress, setWallet] = useState("");
  const [show, setShow] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(1);
  const [status, setStatus] = useState("");
  const publicsale = true;
  const [supply, setSupply] = useState(0);
  const [quantity, setQuantity] = useState(0);

  const handleClose = () => setShow(false);
  const publicsale_price = 30000000000000000;

  const handleShow = async () => {
    setShow(true);
  };

  const onMintHandle = () => {
    setStatus("Mint not allowed!");
  };

  const decreaseTokenNumber = () => {
    if (tokenNumber === 1) {
      return;
    }
    setTokenNumber(tokenNumber - 1);
  };

  const onMintPressed = async () => {
    const { status } = await mintNFT(tokenNumber, publicsale_price);
    setStatus(status);
  };

  useEffect(() => {
    async function fetchData() {
      const { address } = await getCurrentWalletConnected();
      contract.methods
        .totalSupply()
        .call()
        .then((_supply) => {
          setSupply(_supply);
        })
        .catch((err) => console.log(err));
      setWallet(address);
      addWalletListener();
    }
    fetchData();
  }, []);

  function addWalletListener() {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
        } else {
          setWallet("");
        }
      });
    } else {
    }
  }

  const connectWalletPressed = async () => {
    const walletResponse = await connectWallet();
    setWallet(walletResponse.address);
  };

  const handleIncrement = () => {
    if (quantity < 5) {
      setQuantity((prev) => prev + 1);
    }
  };
  const handleDecrement = () => {
    if (quantity > 0) {
      setQuantity((prev) => prev - 1);
    }
  };

  return (
    <>
      <div className="mint-container">
        <div>
          <div className="mint-panel">
            <div className="mint-price">
              Up To 5 Per Wallet
              <br />
              {/* Only 250 Each */}
              One Free Per Wallet. Up To 5 Per Wallet at 0.03ETH.
              <br />
              Plus Gas
            </div>
            <div className="text-center" style={{ width: "100%" }}>
              <Button
                className="connect-btn mt-3"
                onClick={connectWalletPressed}
                style={{
                  borderRadius: "10px",
                  fontSize: "24px",
                  width: "100%",
                }}
              >
                {walletAddress.length > 0 ? (
                  "" +
                  String(walletAddress).substring(0, 6) +
                  "..." +
                  String(walletAddress).substring(38)
                ) : (
                  <span>Connect</span>
                )}
              </Button>
            </div>
            <div className="mint-status text-center">{3086} / 9001</div>
            <div className="df jcc">
              <Button
                className="mint-btn"
                onClick={handleShow}
                style={{
                  borderRadius: "10px",
                  fontSize: "24px",
                  width: "100%",
                }}
              >
                MINT NOW
              </Button>
            </div>
            {/* <div className="custom-minting">
              <button onClick={() => handleDecrement()}>-</button>
              <span>{quantity}</span>
              <button onClick={() => handleIncrement()}>+</button>
            </div> */}
            <div className="df jcc mt10 mb10">
              <Button
                className="mint-btn"
                onClick={mintFreeNFT}
                style={{
                  borderRadius: "10px",
                  fontSize: "24px",
                  width: "100%",
                }}
              >
                MINT ONE FREE
              </Button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <a href="https://twitter.com/aperians" target="_blank">
                <div className="text-base flex justify-center items-center rounded-full cursor-pointer w-10 h-10 bg-white text-black social-icon">
                  <FaSquareXTwitter />
                </div>
              </a>
            </div>
          </div>
          <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>MINT APERIANS</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <img
                src="./images/frame.jpeg"
                alt=""
                style={{ maxWidth: "220px" }}
              />
              <div className="mint-number">
                <button type="button" onClick={decreaseTokenNumber}>
                  <span aria-hidden="true">-</span>
                </button>
                <Form>
                  <Form.Label>{tokenNumber}</Form.Label>
                  {status ? <div>{status}</div> : <div></div>}
                </Form>
                {tokenNumber < 5 ? (
                  <button
                    type="button"
                    onClick={() => setTokenNumber(tokenNumber + 1)}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTokenNumber(tokenNumber)}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              {!publicsale ? (
                <Button onClick={onMintHandle}>Mint</Button>
              ) : (
                <Button onClick={onMintPressed}>Mint</Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </>
  );
};

export default Mint;

import {
    Button,
    Text,
    Title,
    TextField,
    GenericModal,
    Select,
    ModalFooterConfirmation,
    ButtonLink,
} from "@gnosis.pm/safe-react-components";
import React, { useState, useCallback, useEffect } from "react";
import Box from "@material-ui/core/Box";
import styled from "styled-components";
import { AbiItem } from "web3-utils";

import {
    ContractInterface,
    ContractMethod,
} from "../hooks/useServices/interfaceRepository";
import useServices from "../hooks/useServices";
import { ProposedTransaction } from "../typings/models";
import { useSafe } from "../hooks/useSafe";
import WidgetWrapper from "./WidgetWrapper";

import AlkemiEarnVerified_ABI from "constants/ABI/AlkemiEarnVerified_ABI.json";
import AlkemiEarnPublic_ABI from "constants/ABI/AlkemiEarnPublic_ABI.json";

import address from "constants/address_map.json";

import { Hashicon } from "@emeraldpay/hashicon-react";

import whitelistedMethodsVerified from "constants/methods_by_user_verified.json";
import whitelistedMethodsOpen from "constants/methods_by_user_open.json";

const TARGET_USER: string = process.env.REACT_APP_TARGET_USER
    ? process.env.REACT_APP_TARGET_USER
    : "admin";

const ButtonContainer = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
`;

const StyledSelect = styled(Select)`
    width: 400px;
`;

const StyledTitle = styled(Title)`
    margin-top: 0px;
    margin-bottom: 5px;
`;

const StyledText = styled(Text)`
    margin-bottom: 15px;
`;

const StyledExamples = styled.div`
    button {
        padding: 0;
    }
`;

const ModalBody = ({
    txs,
    deleteTx,
}: {
    txs: Array<ProposedTransaction>;
    deleteTx: (index: number) => void;
}) => {
    return (
        <>
            {txs.map((tx, index) => (
                <Box
                    key={index}
                    display="flex"
                    flexDirection="row-reverse"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                >
                    <Button
                        size="md"
                        variant="outlined"
                        iconType="delete"
                        color="error"
                        onClick={() => deleteTx(index)}
                    >
                        {""}
                    </Button>
                    <Text size="lg">{tx.description}</Text>
                </Box>
            ))}
        </>
    );
};

const Dashboard = () => {
    const services = useServices();
    const safe = useSafe();

    const [loadAbiError, setLoadAbiError] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    const [toAddress, setToAddress] = useState("");
    const [contract, setContract] = useState<ContractInterface | undefined>(
        undefined
    );
    const [reviewing, setReviewing] = useState(false);
    const [selectedMethodIndex, setSelectedMethodIndex] = useState(0);
    const [inputCache, setInputCache] = useState<string[]>([]);
    const [addTxError, setAddTxError] = useState<string | undefined>();
    const [transactions, setTransactions] = useState<ProposedTransaction[]>([]);
    const [value, setValue] = useState("");

    const [currentNetwork, setCurrentNetwork] = useState("");
    const [targetUserMethods, setTargetUserMethods] = useState<
        ContractMethod[]
    >([]);

    const [currentPool, setCurrentPool] = useState("");

    useEffect(() => {
        const storedPool = localStorage.getItem('currentPool');

        if(storedPool && storedPool === "open")
            setCurrentPool("open")
        else
            setCurrentPool("verified")
    }, []);

    const handleChangePool = (previousPool : string) => {
        const newPool = previousPool === "open" ? "verified" : "open";

        localStorage.setItem('currentPool', newPool);

        window.location.reload();
    }

    useEffect(() => {
        if(currentPool === "verified" || currentPool === "open") {
            const setABIAndAddress = async (): Promise<ContractInterface | void> => {
                setContract(undefined);
                setLoadAbiError(false);

                const cleanInput = currentPool === "open" ? AlkemiEarnPublic_ABI.toString() : AlkemiEarnVerified_ABI.toString();

                if (
                    !cleanInput.length ||
                    !services.web3 ||
                    !services.interfaceRepo ||
                    !safe.info
                ) {
                    return;
                }

                try {
                    const contract = await services.interfaceRepo.loadAbi(
                        currentPool
                    );
                    setContract(contract);

                    const moneyMarketContractName = currentPool === "open" ? "address_open_MoneyMarket" : "address_MoneyMarket"

                    let moneyMarketAddress = address["main"][moneyMarketContractName];
                    if (safe.info.network === "rinkeby") {
                        moneyMarketAddress =
                            address["rinkeby"][moneyMarketContractName];
                    }

                    setToAddress(moneyMarketAddress);

                    setCurrentNetwork(safe.info.network);
                } catch (e) {
                    setLoadAbiError(true);
                    console.error(e);
                }
            };

            setABIAndAddress();
        }
    }, [services.web3, services.interfaceRepo, safe.info, currentPool]);

    useEffect(() => {
        let arrayOfMethods = currentPool === "open" ? whitelistedMethodsOpen['admin'] : whitelistedMethodsVerified["admin"];
        if (TARGET_USER === "customer") {
            arrayOfMethods = currentPool === "open" ? whitelistedMethodsOpen['customer'] : whitelistedMethodsVerified["customer"];
        }

        const targetMethods =
            contract && contract.methods.length > 0
                ? contract.methods.filter((method) => {
                      return arrayOfMethods.includes(method.name);
                  })
                : [];

        setTargetUserMethods(targetMethods);
    }, [contract, currentPool]);

    const handleMethod = useCallback(
        async (methodIndex: number) => {
            if (!contract || contract.methods.length <= methodIndex) return;
            setSelectedMethodIndex(methodIndex);
        },
        [contract]
    );

    const handleInput = useCallback(
        async (inputIndex: number, input: string) => {
            inputCache[inputIndex] = input;
            setInputCache(inputCache.slice());
        },
        [inputCache]
    );

    const getContractMethod = () => targetUserMethods[selectedMethodIndex];

    const isValueInputVisible = () => {
        const method = getContractMethod();
        return method?.payable;
    };

    const addTransaction = useCallback(async () => {
        let description = "";
        let data = "";

        const web3 = services.web3;

        if (!web3) {
            return;
        }

        if (targetUserMethods.length > selectedMethodIndex) {
            const method = targetUserMethods[selectedMethodIndex];
            const cleanInputs = [];

            description = method.name + " (";
            for (let i = 0; i < method.inputs.length; i++) {
                const cleanValue = inputCache[i] || "";
                cleanInputs[i] =
                    cleanValue.charAt(0) === "["
                        ? JSON.parse(cleanValue.replace(/"/g, '"'))
                        : cleanValue;
                if (i > 0) {
                    description += ", ";
                }
                const input = method.inputs[i];
                description += (input.name || input.type) + ": " + cleanValue;
            }
            description += ")";

            try {
                data = web3.eth.abi.encodeFunctionCall(
                    method as AbiItem,
                    cleanInputs
                );
            } catch (error: any) {
                setAddTxError(error ? error.message : "Something went wrong");
                return;
            }
        }

        try {
            const cleanTo = web3.utils.toChecksumAddress(toAddress);
            const cleanValue = value.length > 0 ? web3.utils.toWei(value) : 0;

            if (data.length === 0) {
                data = "0x";
            }

            if (description.length === 0) {
                description = `Transfer ${cleanValue} ETH to ${cleanTo}`;
            }

            transactions.push({
                description,
                raw: { to: cleanTo, value: cleanValue, data },
            });

            setInputCache([]);
            setTransactions(transactions);
            setSelectedMethodIndex(0);
            setValue("");
        } catch (e) {
            console.error(e);
        }
    }, [
        services,
        transactions,
        toAddress,
        value,
        selectedMethodIndex,
        targetUserMethods,
        inputCache,
    ]);

    const deleteTransaction = useCallback(
        async (inputIndex: number) => {
            const newTxs = transactions.slice();
            newTxs.splice(inputIndex, 1);
            setTransactions(newTxs);
        },
        [transactions]
    );

    const sendTransactions = useCallback(async () => {
        if (!transactions.length) {
            return;
        }

        try {
            safe.sendTransactions(transactions.map((d) => d.raw));
        } catch (e) {
            console.error(e);
        }
    }, [safe, transactions]);

    const handleSubmit = () => {
        sendTransactions();
        setTransactions([]);
        setReviewing(false);
    };

    const handleDismiss = () => {
        setReviewing(false);
    };

    const getInputInterface = (input: any) => {
        // This code renders a helper for the input text.
        // When the parameter is of Tuple type, it renders an array with the parameters types
        // required to form the Tuple, if not, it renders the parameter type directly.
        if (input.type.startsWith("tuple")) {
            return `tuple(${input.components
                .map((c: any) => c.internalType)
                .toString()})${input.type.endsWith("[]") ? "[]" : ""}`;
        } else {
            return input.type;
        }
    };

    const displayHashIcon = () => {
        // icon is a <canvas> element
        return <Hashicon value={toAddress} size={40} />;
    };  

    return (
        <WidgetWrapper>
            <StyledTitle size="sm">Alkemi Earn Safe App</StyledTitle>
            <StyledText size="sm">
                This app allows you to execute multisend transactions for Alkemi
                Earn.
            </StyledText>
            <StyledText size="lg">
                Connected to:{" "}
                <span style={{ fontWeight: "bold", color: ["main", "mainnet"].includes(currentNetwork) ? "OrangeRed" : "IndianRed" }}>{currentNetwork}</span>
                <br />
                Contract address:{" "}
                <span style={{ fontWeight: "bold", color: "DarkMagenta" }}>{toAddress}</span>{" "}
                {displayHashIcon()}
            </StyledText>

            <StyledText size="lg">
                You are using the <span style={{ fontWeight: "bold", color: currentPool === "open" ? "green" : "RoyalBlue" }}>{currentPool}</span> pool. {" "}
                <Button
                    size="md"
                    variant="contained"
                    color="secondary" onClick={() => {handleChangePool(currentPool)}}>
                        Switch to {currentPool === "open" ? "verified" : "open"} pool</Button>
            </StyledText>
            {/* TXs MODAL */}
            {reviewing && transactions.length > 0 && !loadAbiError && (
                <GenericModal
                    body={
                        <ModalBody
                            txs={transactions}
                            deleteTx={deleteTransaction}
                        />
                    }
                    onClose={handleDismiss}
                    title="Send Transactions"
                    footer={
                        <ModalFooterConfirmation
                            handleOk={handleSubmit}
                            handleCancel={handleDismiss}
                        />
                    }
                />
            )}

            {/* ABI Loaded */}
            {contract && (
                <>
                    <Title size="xs">Transaction information</Title>

                    {!targetUserMethods.length && (
                        <Text size="lg">No methods available.</Text>
                    )}

                    {
                        <>
                            {targetUserMethods.length > 0 && (
                                <>
                                    <br />
                                    <StyledSelect
                                        items={targetUserMethods.map(
                                            (method, index) => {
                                                return {
                                                    id: index.toString(),
                                                    label: method.name,
                                                };
                                            }
                                        )}
                                        activeItemId={selectedMethodIndex.toString()}
                                        onItemClick={(id: string) => {
                                            setAddTxError(undefined);
                                            handleMethod(Number(id));
                                        }}
                                    />
                                    <StyledExamples>
                                        <ButtonLink
                                            color="primary"
                                            onClick={() =>
                                                setShowExamples((prev) => !prev)
                                            }
                                        >
                                            {showExamples
                                                ? "Hide Examples"
                                                : "Show Examples"}
                                        </ButtonLink>

                                        {showExamples && (
                                            <>
                                                <Text size="sm" strong>
                                                    string {"> "}
                                                    <Text size="sm" as="span">
                                                        some value
                                                    </Text>
                                                </Text>
                                                <Text size="sm" strong>
                                                    uint256 {"> "}
                                                    <Text size="sm" as="span">
                                                        123
                                                    </Text>
                                                </Text>
                                                <Text size="sm" strong>
                                                    address {"> "}
                                                    <Text size="sm" as="span">
                                                        0xDe75665F3BE46D696e5579628fA17b662e6fC04e
                                                    </Text>
                                                </Text>
                                                <Text size="sm" strong>
                                                    array {"> "}
                                                    <Text size="sm" as="span">
                                                        [1,2,3]
                                                    </Text>
                                                </Text>
                                                <Text size="sm" strong>
                                                    Tuple(uint256, string){" "}
                                                    {"> "}
                                                    <Text size="sm" as="span">
                                                        [1, "someValue"]
                                                    </Text>
                                                </Text>
                                                <Text size="sm" strong>
                                                    Tuple(uint256, string)[]{" "}
                                                    {"> "}
                                                    <Text size="sm" as="span">
                                                        [[1, "someValue"], [2,
                                                        "someOtherValue"]]
                                                    </Text>
                                                </Text>
                                            </>
                                        )}
                                    </StyledExamples>
                                </>
                            )}

                            {getContractMethod()?.inputs.map((input, index) => {
                                return (
                                    <div key={index}>
                                        <TextField
                                            style={{ marginTop: 10 }}
                                            value={inputCache[index] || ""}
                                            label={`${
                                                input.name || ""
                                            }(${getInputInterface(input)})`}
                                            onChange={(e) => {
                                                setAddTxError(undefined);
                                                handleInput(
                                                    index,
                                                    e.target.value
                                                );
                                            }}
                                        />
                                        <br />
                                    </div>
                                );
                            })}

                            {addTxError && (
                                <Text size="lg" color="error">
                                    {addTxError}
                                </Text>
                            )}
                        </>
                    }

                    {/* Input ETH value */}
                    {isValueInputVisible() && (
                        <>
                            <TextField
                                style={{ marginTop: 10, marginBottom: 10 }}
                                value={value}
                                label="ETH"
                                onChange={(e) => setValue(e.target.value)}
                            />

                            <br />
                        </>
                    )}

                    <br />

                    {loadAbiError && (
                        <span style={{ color: "red" }}>
                            <br />
                            Something went wrong, transactions disabled.
                        </span>
                    )}

                    {/* Actions */}
                    <ButtonContainer>
                        {isValueInputVisible() ||
                        contract.methods.length > 0 ? (
                            <Button
                                size="md"
                                color="primary"
                                onClick={() => addTransaction()}
                            >
                                Add transaction
                            </Button>
                        ) : (
                            <div></div>
                        )}

                        <Button
                            size="md"
                            disabled={!transactions.length || loadAbiError}
                            variant="contained"
                            color="primary"
                            onClick={() => setReviewing(true)}
                        >
                            {`Send Transactions ${
                                transactions.length
                                    ? `(${transactions.length})`
                                    : ""
                            }`}
                        </Button>
                    </ButtonContainer>
                </>
            )}
        </WidgetWrapper>
    );
};

export default Dashboard;

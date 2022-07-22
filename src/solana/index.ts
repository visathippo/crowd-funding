import Wallet from "@project-serum/sol-wallet-adapter";
import {
    Connection,
    SystemProgram,
    Transaction,
    PublicKey,
    TransactionInstruction
} from "@solana/web3.js";
import {deserialize, serialize} from "borsh";

const cluster = "http://localhost:8899";
const connection = new Connection(cluster, "confirmed");
const wallet = new Wallet("https://www.sollet.io", cluster);

const programId = new PublicKey("HD5VsMieR5bP37nL1yZTPZTh2yg5CPtvLLEorcGbH6ZV");

export async function setPayerAndBlockhashTransaction(instructions: any[]) {
    const transaction = new Transaction();
    instructions.forEach(element => {
        transaction.add(element);
    });
    transaction.feePayer = wallet.publicKey!;
    let hash = await connection.getRecentBlockhash();
    transaction.recentBlockhash = hash.blockhash;
    return transaction;
}

export async function signAndSendTransaction(transaction: Transaction) {
    try {
        console.log("start signAndSendTransaction");
        let signedTrans = await wallet.signTransaction(transaction);
        console.log("signed transaction");
        let signature = await connection.sendRawTransaction(
            signedTrans.serialize()
        );
        console.log("end signAndSendTransaction");
        return signature;
    } catch (err) {
        console.log("signAndSendTransaction error", err);
        throw err;
    }
}

class CampaignDetails {
    constructor(properties: any) {
        Object.keys(properties).forEach((key) => {
            // @ts-ignore
            this[key] = properties[key];
        });
    }

    // @ts-ignore
    static schema = new Map([[CampaignDetails,
        {
            kind: 'struct',
            fields: [
                ['admin', [32]],
                ['name', 'string'],
                ['description', 'string'],
                ['image_link', 'string'],
                ['amount_donated', 'u64']]
        }]]);

}

async function checkWallet() {
    if (!wallet.connected) {
        await wallet.connect();
    }
}

export async function createCampaign(
    name: string, description: string, image_link: string
) {
    await checkWallet();
    const SEED = "abdd" + Math.random().toString();
    let newAccount = await PublicKey.createWithSeed(
        wallet.publicKey!,
        SEED,
        programId
    );
    let campaign = new CampaignDetails({
        name, description, image_link,
        admin: wallet.publicKey?.toBuffer(),
        amount_donated: 0
    })
    let data = serialize(CampaignDetails.schema, campaign);
    let data_to_send = new Uint8Array([0, ...data]);
    const lamports = (await connection.getMinimumBalanceForRentExemption(data.length));

    const createProgramAccount = SystemProgram.createAccountWithSeed({
        fromPubkey: wallet.publicKey!,
        basePubkey: wallet.publicKey!,
        seed: SEED,
        newAccountPubkey: newAccount,
        lamports: lamports,
        space: data.length,
        programId: programId
    });

    const instructionToOurProgram = new TransactionInstruction({
        keys: [
            {pubkey: newAccount, isSigner: false, isWritable: true},
            {pubkey: wallet.publicKey!, isSigner: true, isWritable: false},
        ],
        programId: programId,
        data: data_to_send as Buffer,
    });

    const trans = await setPayerAndBlockhashTransaction(
        [createProgramAccount, instructionToOurProgram]
    );
    const signature = await signAndSendTransaction(trans);
    const result = await connection.confirmTransaction(signature);
    console.log("end sendMessage", result);

}

export async function getAllCampaigns() {
    let accounts = await connection.getProgramAccounts(programId);
    let campaigns: {
        pubId: PublicKey;
        // @ts-ignore
        name: any;
        // @ts-ignore
        description: any;
        // @ts-ignore
        image_link: any;
        // @ts-ignore
        amount_donated: any;
        // @ts-ignore
        admin: any;
    }[] = []
    accounts.forEach((e) => {
        try {
            let campData = deserialize(CampaignDetails.schema, CampaignDetails, e.account.data);
            campaigns.push({
                pubId: e.pubkey,
                // @ts-ignore
                name: campData.name,
                // @ts-ignore
                description: campData.description,
                // @ts-ignore
                image_link: campData.image_link,
                // @ts-ignore
                amount_donated: campData.amount_donated,
                // @ts-ignore
                admin: campData.admin
            });
        } catch (err) {
            console.log(err);
        }
    });
    return campaigns;
}

export async function donateToCampaign(
    campaignPubKey: any, amount: any
) {
    await checkWallet();

    const SEED = 'abdd' + Math.random().toString();
    let newAccount = await PublicKey.createWithSeed(
        wallet.publicKey!,
        SEED,
        programId
    );
    const createProgramAccount = SystemProgram.createAccountWithSeed({
        fromPubkey: wallet.publicKey!,
        basePubkey: wallet.publicKey!,
        seed: SEED,
        newAccountPubkey: newAccount,
        lamports: amount,
        space: 1,
        programId: programId
    });

    const instructionToOurProgram = new TransactionInstruction({
        keys: [
            { pubkey: campaignPubKey, isSigner: false, isWritable: true },
            { pubkey: newAccount, isSigner: false, isWritable:true},
            { pubkey: wallet.publicKey!, isSigner: true, isWritable: false}
        ],
        programId: programId,
        data: new Uint8Array([2]) as Buffer
    });

    const trans = await setPayerAndBlockhashTransaction(
        [createProgramAccount, instructionToOurProgram]
    );
    const signature = await signAndSendTransaction(trans);
    const result = await connection.confirmTransaction(signature);
    console.log("end sendMessage", result);
}

class WithdrawRequest {
    constructor(properties: any) {
        Object.keys(properties).forEach((key) => {
            // @ts-ignore
            this[key] = properties[key];
        });
    }
    static schema = new Map([[WithdrawRequest,
        {
            kind: 'struct',
            fields: [
                ['amount', 'u64'],
            ]
        }]]);
}

export async function withdraw(
    campaignPubkey: any, amount: any
) {
    await checkWallet();

    let withdrawRequest = new WithdrawRequest({ amount: amount });
    let data = serialize(WithdrawRequest.schema, withdrawRequest);
    let data_to_send = new Uint8Array([1, ...data]);
    const instructionToOurProgram = new TransactionInstruction({
        keys: [
            {pubkey: campaignPubkey, isSigner: false, isWritable: true},
            {pubkey: wallet.publicKey!, isSigner: true, isWritable: false,}
        ],
        programId: programId,
        data: data_to_send as Buffer
    });
    const trans = await setPayerAndBlockhashTransaction([instructionToOurProgram]);
    const signature = await signAndSendTransaction(trans);
    const result = await connection.confirmTransaction(signature);
    console.log("end sendMessage", result);
}

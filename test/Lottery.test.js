const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require('../compile');

let lottery;
let accounts;

beforeEach(async() => {
    accounts = await web3.eth.getAccounts();
    lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data : bytecode })
    .send({ from : accounts[0], gas : '1000000' });
})

describe('Lottery Contract', () => {
    it('deploys the contract', ()=> {
        assert.ok(lottery.options.address);
    });

    it('allows one account to enter', async() => {
        await lottery.methods.enter().send({
            from : accounts[0],
            value : web3.utils.toWei('0.02', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from : accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(1, players.length);
    });

    it('allows multiple accounts to enter', async() => {
        await lottery.methods.enter().send({
            from : accounts[0],
            value : web3.utils.toWei('0.02', 'ether')
        });

        await lottery.methods.enter().send({
            from : accounts[1],
            value : web3.utils.toWei('0.03', 'ether')
        });

        await lottery.methods.enter().send({
            from : accounts[2],
            value : web3.utils.toWei('0.04', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from : accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('requires minimum amount of ether to enter', async() => {
        try {
            await lottery.methods.enter().send({
                from : accounts[0],
                value : 1000 
                // a random amount of wei < .01 ether
            });
            // if this enter doesn't throw an error
            // then assert(false) will fail the test
            assert(false);
        }
        catch (err) {
            assert(err);
            // this will assert err for truthness
        }
    });

    it('only manager can call pickWinner', async() => {
        try {
            await lottery.methods.pickWinner().send({
               from : accounts[1]
            });
            assert(false);
        }
        catch (err){
            assert(err);
        }
    });

    it('sends money to the Winner and resets the players array', async() => {
        await lottery.methods.enter().send({
            from : accounts[0],
            value : web3.utils.toWei('3', 'ether')
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await lottery.methods.pickWinner().send({
            from : accounts[0]
        });

        const finalBalance = await web3.eth.getBalance(accounts[0]);
        const difference = finalBalance - initialBalance ;
        // this difference will be around 3 ether, 
        // but because we pay for the gas price, it will be slightly less than 3
        assert(difference > web3.utils.toWei('2.8', 'ether'));

        const playersArray = await lottery.methods.getPlayers().call({
            from : accounts[0]
        });
        
        const balance = await lottery.methods.getBalance().call({
            from : accounts[0]
        });
        // test that the balance of the contract is 0
        // and that the players Array is reset
        assert.equal(0, balance);
        assert.equal(0, playersArray.length);
    });
});
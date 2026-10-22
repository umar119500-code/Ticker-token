// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Ticker (TICK)
/// @notice Fixed-supply BEP-20/ERC-20 token. The entire supply is minted once, in the constructor,
///         to `initialHolder`. There is no owner, no mint/burn entry point, no fees, no blacklist,
///         no pause and no upgrade mechanism.
contract TickerToken is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    error ZeroInitialHolder();

    constructor(address initialHolder) ERC20("Ticker", "TICK") {
        if (initialHolder == address(0)) revert ZeroInitialHolder();
        _mint(initialHolder, TOTAL_SUPPLY);
    }
}

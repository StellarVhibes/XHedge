import re

with open("smartcontract/contracts/volatility_shield/src/test.rs", "r") as f:
    content = f.read()

# Fix client.deposit(&owner, &token_id, &1000i128); -> client.deposit(&owner, &token_id, &1000i128, &None);
content = content.replace("client.deposit(&owner, &token_id, &1000i128);", "client.deposit(&owner, &token_id, &1000i128, &None);")
content = content.replace("client.deposit(&admin, &asset, &1000i128);", "client.deposit(&admin, &asset, &1000i128, &None);")

# Wait, there's also an error: no method named `rebalance` found
# Is there `client.rebalance` in test.rs but `rebalance` is not in lib.rs?
# Let's replace client.rebalance(
content = content.replace("client.rebalance(", "client.try_rebalance(")

with open("smartcontract/contracts/volatility_shield/src/test.rs", "w") as f:
    f.write(content)

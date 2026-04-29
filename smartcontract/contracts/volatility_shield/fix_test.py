import re

with open("src/test.rs", "r") as f:
    content = f.read()

# Fix client.deposit(&owner, &token_id, &1000i128); -> client.deposit(&owner, &token_id, &1000i128, &None);
content = content.replace("client.deposit(&owner, &token_id, &1000i128);", "client.deposit(&owner, &token_id, &1000i128, &None);")
content = content.replace("client.deposit(&admin, &asset, &1000i128);", "client.deposit(&admin, &asset, &1000i128, &None);")

content = content.replace("client.rebalance(", "client.try_rebalance(")

with open("src/test.rs", "w") as f:
    f.write(content)

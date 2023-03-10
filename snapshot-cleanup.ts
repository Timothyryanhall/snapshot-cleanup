const AWS = require('aws-sdk');
const rds = new AWS.RDS();
const ec2 = new AWS.EC2();

exports.handler = async (event, context) => {
  try {
    // Get all the RDS snapshots in the account
    const response = await rds.describeDBSnapshots().promise();
    const snapshots = response.DBSnapshots;

    // Loop through each snapshot and get its creation date by dividing by miliseconds
    for (const snapshot of snapshots) {
      const snapshotAge = (new Date() - snapshot.SnapshotCreateTime) / 1000 / 60 / 60 / 24;

      // Check if the parent database still exists
      const dbInstances = await rds.describeDBInstances({
        DBInstanceIdentifier: snapshot.DBInstanceIdentifier
      }).promise();
      if (dbInstances.DBInstances.length === 0) {
        // Delete the snapshot if the parent database no longer exists
        await rds.deleteDBSnapshot({
          DBSnapshotIdentifier: snapshot.DBSnapshotIdentifier
        }).promise();
        continue;
      }

      // Check if the snapshot is older than 21 days
      if (snapshotAge > 21) {
        // Delete the snapshot if the parent database is still running
        await rds.deleteDBSnapshot({
          DBSnapshotIdentifier: snapshot.DBSnapshotIdentifier
        }).promise();
      }
    }

    // Verify snapshot retention policy (as described via an attribute) for all RDS dbs, and throw error if it is not 21 days
    const dbSnapshotAttributes = await rds.describeAccountAttributes({
      AttributeNames: ['dbSnapshotAttributes']
    }).promise();
    const dbSnapshotMaxRetention = dbSnapshotAttributes.AccountQuotas[0].Max;
    if (dbSnapshotMaxRetention != 21) {
      throw new Error('Snapshot retention policy is not set to 21 days for all databases in the prod account.');
    }
    
    // Get snapshots that are not tagged with 'prod'
    const nonProdDBInstances = await rds.describeDBInstances({
      Filters: [{
        Name: 'tag:Environment',
        Values: ['!prod']
      }]
    }).promise();

    // Set BackupRetentionPeriod to 0 for non-prod rds instances, effectively disabling snapshots
    for (const nonProdDBInstance of nonProdDBInstances.DBInstances) {
      await rds.modifyDBInstance({
        DBInstanceIdentifier: nonProdDBInstance.DBInstanceIdentifier,
        BackupRetentionPeriod: 0
      }).promise();
    }

    return 'Success!';
  } catch (error) {
    throw new Error(error);
  }
};
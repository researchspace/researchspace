/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

package com.metaphacts.services.storage.git;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

import javax.annotation.Nullable;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.MergeCommand;
import org.eclipse.jgit.api.ResetCommand;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.dircache.DirCache;
import org.eclipse.jgit.dircache.DirCacheBuilder;
import org.eclipse.jgit.dircache.DirCacheEntry;
import org.eclipse.jgit.errors.InvalidObjectIdException;
import org.eclipse.jgit.internal.storage.file.FileRepository;
import org.eclipse.jgit.lib.CommitBuilder;
import org.eclipse.jgit.lib.Constants;
import org.eclipse.jgit.lib.FileMode;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.ObjectInserter;
import org.eclipse.jgit.lib.ObjectLoader;
import org.eclipse.jgit.lib.ObjectReader;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.lib.Ref;
import org.eclipse.jgit.lib.RefUpdate;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.transport.PushResult;
import org.eclipse.jgit.transport.RemoteConfig;
import org.eclipse.jgit.transport.RemoteRefUpdate;
import org.eclipse.jgit.transport.URIish;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.filter.AndTreeFilter;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.eclipse.jgit.treewalk.filter.TreeFilter;

import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.ThreadFactoryBuilder;
import com.metaphacts.services.storage.StorageUtils;
import com.metaphacts.services.storage.api.ObjectMetadata;
import com.metaphacts.services.storage.api.ObjectRecord;
import com.metaphacts.services.storage.api.ObjectStorage;
import com.metaphacts.services.storage.api.PathMapping;
import com.metaphacts.services.storage.api.SizedStream;
import com.metaphacts.services.storage.api.StorageException;
import com.metaphacts.services.storage.api.StorageLocation;
import com.metaphacts.services.storage.api.StoragePath;

public class GitStorage implements ObjectStorage {
    private static final Logger logger = LogManager.getLogger(GitStorage.class);

    public static final String STORAGE_TYPE = "git";

    private final PathMapping paths;
    private final GitStorageConfig config;

    private Repository repository;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    private ExecutorService executor;

    public GitStorage(PathMapping paths, GitStorageConfig config) throws StorageException {
        this.paths = paths;
        this.config = config;

        initialize();
    }

    private void initialize() throws StorageException {

        if (!Files.isDirectory(config.getLocalPath())) {
            throw new StorageException("Local path does not exists or not a directory: " + config.getLocalPath());
        }

        Path gitFolder = config.getLocalPath().resolve(".git");
        try {
            if (!Files.isDirectory(gitFolder)) {
                if (config.getRemoteUrl() == null) {
                    throw new StorageException(
                        "Cannot clone repository without 'remoteUrl' specified");
                }
                cloneRepository();
            }
            initializeExisting(gitFolder);
        } catch (IOException | GitAPIException e) {
            throw new StorageException(
                "Failed to open Git repository at: " + config.getLocalPath(), e);
        }

        executor = Executors
                .newSingleThreadExecutor(new ThreadFactoryBuilder().setNameFormat("git-storage-%d").build());
    }

    private void cloneRepository() throws GitAPIException, IOException {
        logger.info("Cloning remote repository <" +
            config.getRemoteUrl() + "> at " + config.getLocalPath());
        // TODO: this requires to provide Git credentials in some form
        throw new StorageException(String.format(
            "Automatic git clone is not supported: a '.git' repository must exist in %s",
            config.getLocalPath()
        ));
    }

    private void initializeExisting(Path gitFolder) throws GitAPIException, IOException {
        repository = new FileRepository(gitFolder.toFile());
        try (Git git = new Git(repository)) {
            assertCleanWorkTree(git);

            if (config.getRemoteUrl() != null) {
                RemoteConfig origin = git.remoteList().call().stream()
                    .filter(r -> r.getName().equals("origin"))
                    .findFirst()
                    .orElseThrow(() -> new StorageException(
                        "Git repository is required to have 'origin' remote when 'remoteUrl' is set"
                    ));
                URIish originUri = origin.getURIs().size() == 1 ? origin.getURIs().get(0) : null;
                if (originUri == null || !originUri.toPrivateString().equals(config.getRemoteUrl())) {
                    throw new StorageException(
                        "'origin' remote is inconsistent with storage configuration"
                    );
                }
            }

            if (config.getBranch() != null && !config.getBranch().equals(repository.getBranch())) {
                logger.info("Checking out branch '" +
                    config.getBranch() + "' at " + config.getLocalPath());
                git.checkout().setName(config.getBranch()).call();
            }
        } catch (GitAPIException | IOException e) {
            repository.close();
            throw e;
        }
    }


    @Override
    public synchronized void close() throws StorageException {

        if (executor != null) {
            executor.shutdown();
            try {
                executor.awaitTermination(30, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                executor.shutdownNow();
            }
        }
    }

    private final class GitStorageLocation implements StorageLocation {
        private ObjectId blobId;

        public GitStorageLocation(ObjectId blobId) {
            this.blobId = blobId;
        }

        @Override
        public ObjectStorage getStorage() {
            return GitStorage.this;
        }

        @Override
        public SizedStream readSizedContent() throws IOException {
            ObjectLoader loader = repository.open(blobId, Constants.OBJ_BLOB);
            return new SizedStream(loader.openStream(), loader.getSize());
        }
    }

    @Override
    public boolean isMutable() {
        return config.isMutable();
    }

    @Override
    public Optional<ObjectRecord> getObject(
        StoragePath path,
        @Nullable String revision
    ) throws StorageException {
        Optional<StoragePath> mappedPath = paths.mapForward(path);
        if (!mappedPath.isPresent()) {
            return Optional.empty();
        }

        try {
            lock.readLock().lock();
            try (RevWalk walk = new RevWalk(repository)) {
                PathFilter pathFilter = PathFilter.create(mappedPath.get().toString());

                if (revision == null) {
                    ObjectId headCommitId = repository.resolve(Constants.HEAD);
                    RevCommit headCommit = parseCommitOrNull(walk, headCommitId);
                    if (headCommit == null) {
                        return Optional.empty();
                    }

                    // return nothing if object is missing from HEAD commit,
                    // even if it's still present in the Git history
                    if (!lookupRecord(path, headCommit, pathFilter).isPresent()) {
                        return Optional.empty();
                    }

                    walk.markStart(headCommit);
                    walk.setTreeFilter(AndTreeFilter.create(pathFilter, TreeFilter.ANY_DIFF));
                    for (RevCommit commit : walk) {
                        return lookupRecord(path, commit, pathFilter);
                    }
                    return Optional.empty();
                } else {
                    ObjectId targetCommitId;
                    try {
                        targetCommitId = ObjectId.fromString(revision);
                    } catch (InvalidObjectIdException e) {
                        return Optional.empty();
                    }
                    RevCommit commit = parseCommitOrNull(walk, targetCommitId);
                    if (commit == null) {
                        return Optional.empty();
                    }
                    return lookupRecord(path, commit, pathFilter);
                }
            }
        } catch (IOException e) {
            throw new StorageException(e);
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public List<ObjectRecord> getRevisions(StoragePath path) throws StorageException {
        Optional<StoragePath> mappedPath = paths.mapForward(path);
        if (!mappedPath.isPresent()) {
            return ImmutableList.of();
        }

        try {
            lock.readLock().lock();
            try (RevWalk walk = new RevWalk(repository)) {
                PathFilter pathFilter = PathFilter.create(mappedPath.get().toString());

                ObjectId headCommitId = repository.resolve(Constants.HEAD);
                RevCommit headCommit = parseCommitOrNull(walk, headCommitId);
                if (headCommit == null) {
                    return ImmutableList.of();
                }
                walk.markStart(headCommit);
                walk.setTreeFilter(AndTreeFilter.create(pathFilter, TreeFilter.ANY_DIFF));

                List<ObjectRecord> records = new ArrayList<>();
                for (RevCommit commit : walk) {
                    Optional<ObjectRecord> foundRecord = lookupRecord(path, commit, pathFilter);
                    if (foundRecord.isPresent()) {
                        records.add(foundRecord.get());
                    }
                }
                return records;
            }
        } catch (IOException e) {
            throw new StorageException(e);
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public List<ObjectRecord> getAllObjects(StoragePath prefix) throws StorageException {
        Optional<StoragePath> mappedPrefix = paths.mapForward(prefix);
        if (!mappedPrefix.isPresent()) {
            return ImmutableList.of();
        }

        try {
            lock.readLock().lock();
            try (RevWalk walk = new RevWalk(repository)) {
                TreeFilter pathFilter = mappedPrefix.get().isEmpty()
                    ? TreeFilter.ALL
                    : PathFilter.create(mappedPrefix.get().toString() + "/");

                ObjectId headCommitId = repository.resolve(Constants.HEAD);
                RevCommit headCommit = parseCommitOrNull(walk, headCommitId);
                if (headCommit == null) {
                    return ImmutableList.of();
                }

                try (TreeWalk treeWalk = new TreeWalk(repository)) {
                    treeWalk.addTree(headCommit.getTree());
                    treeWalk.setRecursive(true);
                    treeWalk.setFilter(pathFilter);

                    List<ObjectRecord> records = new ArrayList<>();

                    while (treeWalk.next()) {
                        String path = treeWalk.getPathString();
                        Optional<StoragePath> mappedObjectId = StoragePath.tryParse(path).flatMap(paths::mapBack);
                        if (mappedObjectId.isPresent()) {
                            Optional<ObjectRecord> record = getObject(mappedObjectId.get(), null);
                            if (record.isPresent()) {
                                records.add(record.get());
                            }
                        }
                    }

                    return records;
                }
            }
        } catch (IOException e) {
            throw new StorageException(e);
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public ObjectRecord appendObject(
        StoragePath path,
        ObjectMetadata metadata,
        InputStream content,
        long contentLength
    ) throws StorageException {
        StorageUtils.throwIfNonMutable(config.isMutable());

        StoragePath objectPath = paths.mapForward(path).orElseThrow(() ->
            new StorageException(String.format("Cannot map object path: %s", path))
        );
        String message = "Append: " + objectPath;
        PersonIdent author = createAuthorFromMetadata(metadata.withCurrentDate());

        RevCommit commit;
        try {
            lock.writeLock().lock();

            ObjectId insertedBlobId;
            try (ObjectInserter inserter = repository.newObjectInserter()) {
                insertedBlobId = inserter.insert(Constants.OBJ_BLOB, contentLength, content);
                inserter.flush();
            } catch (IOException e) {
                throw new StorageException(
                    "Failed to insert object content into Git object database", e);
            }

            try {
                commit = performAttemptsToCommitAndPushChanges(
                    objectPath, insertedBlobId, author, message
                );
            } catch (IOException | GitAPIException e) {
                throw new StorageException(e);
            }
        } finally {
            lock.writeLock().unlock();
        }

        try {
            lock.readLock().lock();
            return lookupRecord(path, commit, PathFilter.create(objectPath.toString()))
                .orElseThrow(() -> new StorageException(
                    "Failed to find newly committed object: " + objectPath));
        } catch (IOException e) {
            throw new StorageException(e);
        } finally {
            lock.readLock().unlock();
        }
    }

    @Override
    public void deleteObject(
        StoragePath path,
        ObjectMetadata metadata
    ) throws StorageException {
        StorageUtils.throwIfNonMutable(config.isMutable());

        StoragePath objectPath = paths.mapForward(path).orElseThrow(() ->
            new StorageException(String.format("Cannot map object path: %s", path)));
        String message = "Delete: " + objectPath;
        PersonIdent author = createAuthorFromMetadata(metadata.withCurrentDate());

        try {
            lock.writeLock().lock();
            performAttemptsToCommitAndPushChanges(objectPath, null, author, message);
        } catch (IOException | GitAPIException e) {
            throw new StorageException(e);
        } finally {
            lock.writeLock().unlock();
        }
    }

    @Nullable
    private static RevCommit parseCommitOrNull(RevWalk walk, ObjectId commitId) throws IOException {
        RevCommit commit = walk.lookupCommit(commitId);
        if (commit == null) {
            return null;
        }
        walk.parseHeaders(commit);
        walk.parseBody(commit);
        return commit;
    }

    private PersonIdent createAuthorFromMetadata(ObjectMetadata metadataWithDate) {
        return new PersonIdent(
            metadataWithDate.getAuthor() == null ? "" : metadataWithDate.getAuthor(),
            "", // set email as empty
            Date.from(metadataWithDate.getCreationDate()),
            TimeZone.getTimeZone("UTC")
        );
    }

    private RevCommit performAttemptsToCommitAndPushChanges(
        StoragePath objectPath,
        @Nullable ObjectId newBlobId,
        PersonIdent author,
        String commitMessage
    ) throws IOException, GitAPIException {
        try (Git git = new Git(repository)) {
            assertCleanWorkTree(git);
        }


        Ref head = repository.exactRef(Constants.HEAD);
        if (head == null || !head.isSymbolic()) {
            throw new StorageException("Cannot update repository with detached HEAD");
        }
        ObjectId headCommitId = head.getObjectId();

        RevCommit committedChanges;
        try {
            committedChanges = commitChanges(head, objectPath, newBlobId, author, commitMessage);
        } catch (Exception e) {
            performRollback(headCommitId);
            throw e;
        }

        if (config.getRemoteUrl() != null) {
            String branch = head.getTarget().getName();
            pushChangesAsynch(headCommitId, branch, committedChanges);
        }

        return committedChanges;

    }

    private RevCommit commitChanges(
        Ref head,
        StoragePath objectPath,
        @Nullable ObjectId newBlobId,
        PersonIdent author,
        String commitMessage
    ) throws IOException, GitAPIException {
        String initialBranch = head.getTarget().getName();
        ObjectId headCommitId = head.getObjectId();
        RevCommit headCommit =
            headCommitId == null ? null : repository.parseCommit(headCommitId);

        try (ObjectInserter inserter = repository.newObjectInserter()) {
            DirCache newIndex = DirCache.newInCore();
            if (headCommit != null) {
                readIndexFromTree(newIndex, headCommit.getTree());
            }

            Optional<DirCacheEntry> targetEntry = addOrRemoveIndexEntry(newIndex, objectPath, newBlobId);
            if (!targetEntry.isPresent()) {
                // index entry is unchanged
                return headCommit;
            }

            DirCacheEntry entry = targetEntry.get();
            if (newBlobId != null) {
                entry.setObjectId(newBlobId);
                entry.setFileMode(FileMode.REGULAR_FILE);
                long commitTime = author.getWhen().toInstant().toEpochMilli();
                entry.setCreationTime(commitTime);
                entry.setLastModified(commitTime);
            }

            ObjectId insertedTreeId = newIndex.writeTree(inserter);
            inserter.flush();

            CommitBuilder commit = new CommitBuilder();
            commit.setTreeId(insertedTreeId);
            commit.setCommitter(author);
            commit.setAuthor(author);
            commit.setMessage(commitMessage);
            if (headCommitId != null) {
                commit.setParentIds(headCommitId);
            }

            ObjectId insertedCommitId = inserter.insert(commit);
            RevCommit insertedCommit = repository.parseCommit(insertedCommitId);

            RefUpdate ru = repository.updateRef(Constants.HEAD);

            ru.setNewObjectId(insertedCommitId);
            ru.setRefLogMessage("commit: " + insertedCommit.getShortMessage(), false);
            ru.setExpectedOldObjectId(headCommitId == null ? ObjectId.zeroId() : headCommitId);
            RefUpdate.Result rc = ru.forceUpdate();
            switch (rc) {
                case NEW:
                case FORCED:
                case FAST_FORWARD:
                    break;
                case REJECTED:
                case LOCK_FAILURE:
                    throw new StorageException("Failed to lock HEAD");
                default:
                    throw new StorageException("Failed to update Git ref");
            }

            try (Git git = new Git(repository)) {
                git.reset().setRef(initialBranch).setMode(ResetCommand.ResetType.HARD).call();
            }

            return insertedCommit;
        }
    }

    private void pushChangesAsynch(ObjectId headCommitId, String branch, RevCommit committedChanges) {

        executor.submit(() -> {
            try {
                pushChanges(headCommitId, branch, committedChanges);
            } catch (Throwable e) {
                logger.warn("Failed to push changes to remote in background thread: " + e.getMessage());
                logger.debug("Details:", e);
            }
        });
    }

    private void pushChanges(ObjectId headCommitId, String branch, RevCommit committedChanges)
            throws GitAPIException, StorageException {

        int attempts = 0;
        do {
            RemoteRefUpdate.Status pushStatus = tryPushChanges(branch);
            switch (pushStatus) {
            case OK:
                logger.debug("Successfully pushed changes to remote as commit " + committedChanges.getId().getName());
                return;
            case REJECTED_NONFASTFORWARD:
                logger.debug("Remote repository has other changes; trying to pull them and commit again");
                try {
                    lock.writeLock().lock();
                    performRollback(headCommitId);
                    pullChangesInFastForwardMode();
                } finally {
                    lock.writeLock().unlock();
                }
                break;
            default:
                logger.debug("Failed to push due to unexpected reason: {}; resetting to initial state",
                        pushStatus.name());
                performRollback(headCommitId);
                throw new StorageException("Unexpected update status from pushing changes: " + pushStatus.name());
            }

            attempts++;
        } while (attempts < config.getMaxPushAttempts());

        throw new StorageException(
                "Failed to push committed changes after " + config.getMaxPushAttempts() + " failed attempts");
    }

    private RemoteRefUpdate.Status tryPushChanges(String branch) throws GitAPIException {
        try (Git git = new Git(repository)) {
            logger.debug("Pushing changes to remote repository...");
            Iterable<PushResult> results = git.push()
                .add(branch)
                .setAtomic(true)
                .setRemote("origin")
                .call();
            for (PushResult result : results) {
                String messages = result.getMessages();
                if (!messages.isEmpty()) {
                    logger.debug("Push message: {}", result.getMessages());
                }
                for (RemoteRefUpdate update : result.getRemoteUpdates()) {
                    if (update.getStatus() != RemoteRefUpdate.Status.OK) {
                        return update.getStatus();
                    }
                }
            }
            return RemoteRefUpdate.Status.OK;
        }
    }

    private void pullChangesInFastForwardMode() throws GitAPIException {
        try (Git git = new Git(repository)) {
            git.pull()
                .setRemote("origin")
                .setFastForward(MergeCommand.FastForwardMode.FF_ONLY)
                .call();
        }
    }

    private Optional<ObjectRecord> lookupRecord(
        StoragePath originalPath,
        RevCommit commit,
        PathFilter filter
    ) throws IOException {
        Optional<GitStorageLocation> location = lookupBlob(commit, filter);
        if (!location.isPresent()) {
            return Optional.empty();
        }
        String foundRevision = commit.getId().name();
        ObjectMetadata metadata = getMetadata(commit);
        return Optional.of(
            new ObjectRecord(location.get(), originalPath, foundRevision, metadata)
        );
    }

    private Optional<GitStorageLocation> lookupBlob(RevCommit commit, PathFilter filter) throws IOException {
        try (TreeWalk treeWalk = new TreeWalk(repository)) {
            treeWalk.addTree(commit.getTree());
            treeWalk.setRecursive(true);
            treeWalk.setFilter(filter);
            if (treeWalk.next()) {
                ObjectId blobId = treeWalk.getObjectId(0);
                return Optional.of(new GitStorageLocation(blobId));
            }
            return Optional.empty();
        }
    }

    private ObjectMetadata getMetadata(RevCommit commit) {
        String author = commit.getAuthorIdent().getName();
        Date when = commit.getAuthorIdent().getWhen();
        return new ObjectMetadata(author, when.toInstant());
    }

    private void assertCleanWorkTree(Git git) throws GitAPIException, StorageException {
        if (!git.status().call().isClean()) {
            throw new StorageException("Git work tree is not clean");
        }
    }

    private void readIndexFromTree(DirCache index, RevTree tree) throws IOException {
        DirCacheBuilder builder = index.builder();
        try (ObjectReader reader = repository.newObjectReader()) {
            builder.addTree(null, DirCacheEntry.STAGE_0, reader, tree.getId());
        }
        builder.finish();
    }

    private Optional<DirCacheEntry> addOrRemoveIndexEntry(
        DirCache index,
        StoragePath objectPath,
        @Nullable ObjectId newBlobId
    ) {
        DirCacheEntry entry = index.getEntry(objectPath.toString());
        boolean unchanged = (
            entry == null && newBlobId == null ||
            entry != null && entry.getObjectId().equals(newBlobId)
        );
        if (unchanged) {
            return Optional.empty();
        }
        if (entry == null) {
            DirCacheBuilder builder = index.builder();
            for (int i = 0; i < index.getEntryCount(); i++) {
                builder.add(index.getEntry(i));
            }
            entry = new DirCacheEntry(objectPath.toString());
            entry.setFileMode(FileMode.REGULAR_FILE);
            builder.add(entry);
            builder.finish();
        } else if (newBlobId == null) {
            DirCacheBuilder builder = index.builder();
            for (int i = 0; i < index.getEntryCount(); i++) {
                DirCacheEntry existing = index.getEntry(i);
                if (existing != entry) {
                    // add all entries except the removed one
                    builder.add(index.getEntry(i));
                }
            }
            builder.finish();
        }
        return Optional.of(entry);
    }

    private void performRollback(ObjectId rollbackTo) throws GitAPIException {
        logger.debug("Performing rollback to " + rollbackTo.toString());
        try (Git git = new Git(repository)) {
            git.reset()
                .setMode(ResetCommand.ResetType.HARD)
                .setRef(rollbackTo.getName())
                .call();
        }
    }
}
